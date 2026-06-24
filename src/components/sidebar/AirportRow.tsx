import { memo } from "react";
import { TowerControl } from "lucide-react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useUnitPreferences } from "@/features/app-shell/unitPreferences/UnitPreferencesProvider";
import { formatNearbyDistanceDisplay } from "@/features/aviation/distanceDisplayModel";
import { airportCityName, airportDisplayCodeLine, airportDisplayName } from "@/utils/airport";
import { countryName } from "@/utils/flag";
import { formatAltitude } from "@/utils/units";
import { rowPropsEqual } from "./rowPropsEqual";

// Airport equivalent of AircraftRow — same column rhythm so an
// "airports & aircraft" mixed list reads as one coherent table.
// Left: ICAO · IATA / city + country. Right: DIST and ELEV (in place of
// the aircraft row's GS / ALT).
function AirportRow({
  airport,
  airportId,
  selected,
  onSelectAirport,
}: Record<string, any>) {
  const { locale, t } = useI18n();
  const { preferences: units } = useUnitPreferences();
  const code = airportDisplayCodeLine(airport);
  const city = airportCityName(airport?.city, locale);
  const country = countryName(airport?.country, locale) || airport?.country || "";
  const placeText =
    [city, country].filter(Boolean).join(", ") ||
    airportDisplayName(airport, locale);
  const dist = toFiniteNumber(airport?.distanceNm);
  const distanceDisplay = formatNearbyDistanceDisplay(dist, units.distance);
  const elevation = toFiniteNumber(airport?.elevationFt);
  const elevationDisplay =
    elevation == null
      ? null
      : formatAltitude(elevation, units.altitude, { kind: "ground" });
  const endpointRole = normalizeEndpointRole(airport?.routeEndpointRole);
  const endpointLabel = endpointRole
    ? t(
        endpointRole === "origin"
          ? "sidebar.endpointOrigin"
          : "sidebar.endpointDestination",
      )
    : "";

  return (
    <button
      type="button"
      className={`aircraft-table-card aircraft-table-row-grid aircraft-table-row-shell grid w-full items-center px-[var(--airport-sidebar-inset)] text-left transition-[background,color] hover:bg-[color-mix(in_oklab,var(--atc-elev)_55%,transparent)] ${
        selected ? "aircraft-table-row--active" : ""
      }`}
      aria-pressed={selected}
      onClick={() => airportId && onSelectAirport?.(airportId)}
    >
      <span aria-hidden="true" className="aircraft-table-row-glyph">
        <TowerControl size={13} strokeWidth={2.4} />
      </span>
      <div className="aircraft-table-identity aircraft-table-identity--solo min-w-0">
        <span
          className="aircraft-table-callsign airport-sidebar-display-mono notranslate truncate text-[12px] font-semibold text-atc-text"
          translate="no"
        >
          {code}
        </span>
        {placeText ? (
          <span className="truncate text-[9.5px] text-atc-dim">{placeText}</span>
        ) : null}
      </div>
      <div className="aircraft-table-cell aircraft-table-cell--distance text-right font-mono text-[12px] font-semibold text-atc-text">
        {!distanceDisplay ? (
          <NumberWithUnit text="-" unit="" />
        ) : distanceDisplay.text ? (
          <NumberWithUnit text={distanceDisplay.text} unit={distanceDisplay.unit} />
        ) : (
          <NumberWithUnit value={distanceDisplay.value} unit={distanceDisplay.unit} />
        )}
      </div>
      <div className="aircraft-table-cell aircraft-table-cell--altitude text-right font-mono text-[12px] font-semibold text-atc-text">
        {endpointLabel ? (
          <span className="text-[9px] uppercase tracking-normal text-atc-dim">
            {endpointLabel}
          </span>
        ) : !elevationDisplay ? (
          <NumberWithUnit text="-" unit="" />
        ) : (
          <NumberWithUnit
            value={elevationDisplay.value}
            unit={elevationDisplay.unit.toUpperCase()}
          />
        )}
      </div>
    </button>
  );
}

// Memoized (field-based, like AircraftRow) so poll-driven re-renders of the
// list don't re-render every airport row when its displayed data is unchanged.
export default memo(AirportRow, (prev, next) =>
  rowPropsEqual(prev, next, {
    scalarKeys: ["selected", "airportId", "onSelectAirport"],
    nestedKey: "airport",
    nestedFields: [
      "icao",
      "iata",
      "city",
      "country",
      "distanceNm",
      "elevationFt",
      "routeEndpointRole",
    ],
  }),
);

function NumberWithUnit({ value, unit, format, text }: Record<string, any>) {
  const displayText =
    text ?? format?.format?.(Number(value)) ?? String(value ?? "");

  return (
    <span className="aircraft-table-number grid w-full grid-cols-[minmax(0,1fr)_var(--aircraft-table-unit-width,14px)] items-baseline gap-x-0.5 tabular-nums">
      <span className="block min-w-0 text-right">{displayText}</span>
      <sub
        className="aircraft-table-unit notranslate relative top-[0.22em] block text-left text-[7px] font-semibold leading-none text-atc-dim"
        translate="no"
      >
        {unit}
      </sub>
    </span>
  );
}

function toFiniteNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeEndpointRole(value: unknown) {
  const role = String(value || "").trim().toLowerCase();
  return role === "origin" || role === "destination" ? role : "";
}
