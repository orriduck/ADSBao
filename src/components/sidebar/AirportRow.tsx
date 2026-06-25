import { memo } from "react";
import { TowerControl } from "lucide-react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useUnitPreferences } from "@/features/app-shell/unitPreferences/UnitPreferencesProvider";
import { formatNearbyDistanceDisplay } from "@/features/aviation/distanceDisplayModel";
import { airportDisplayCodeLine } from "@/utils/airport";
import { countryName, flagEmoji } from "@/utils/flag";
import { formatAltitude } from "@/utils/units";
import { rowPropsEqual } from "./rowPropsEqual";

// Airport equivalent of AircraftRow — same two-line rhythm so an
// "airports & aircraft" mixed list reads as one coherent table.
// Line 1: ICAO · IATA + distance. Line 2: flag + country + elevation.
// The full "City, Country" lives in the preview card, not the compact row.
function AirportRow({
  airport,
  airportId,
  selected,
  onSelectAirport,
}: Record<string, any>) {
  const { locale, t } = useI18n();
  const { preferences: units } = useUnitPreferences();
  const code = airportDisplayCodeLine(airport);
  const flag = flagEmoji(airport?.country);
  const country = countryName(airport?.country, locale) || airport?.country || "";
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
      className={`aircraft-table-card aircraft-table-row-two aircraft-table-row-shell flex w-full items-center gap-2 px-[var(--airport-sidebar-inset)] text-left transition-[background,color,box-shadow] hover:bg-[color-mix(in_oklab,var(--atc-elev)_55%,transparent)] data-[selected=true]:bg-[color-mix(in_oklab,var(--atc-signal-accent)_12%,transparent)] data-[selected=true]:shadow-[inset_2px_0_0_var(--atc-signal-accent)] data-[selected=true]:hover:bg-[color-mix(in_oklab,var(--atc-signal-accent)_15%,transparent)] data-[selected=true]:[&_.aircraft-table-row-glyph]:text-[var(--atc-signal-accent)] ${
        selected ? "aircraft-table-row--selected aircraft-table-row--active" : ""
      }`}
      data-selected={selected ? "true" : undefined}
      aria-pressed={selected}
      onClick={() => airportId && onSelectAirport?.(airportId)}
    >
      <span aria-hidden="true" className="aircraft-table-row-glyph">
        <TowerControl size={13} strokeWidth={2.4} />
      </span>
      <div className="aircraft-table-identity grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] gap-x-2.5">
        <span
          className="aircraft-table-callsign airport-sidebar-display-mono notranslate min-w-0 self-center truncate text-[12.5px] text-atc-text"
          translate="no"
        >
          {code}
        </span>
        <div className="aircraft-table-metric aircraft-table-metric--distance self-center text-right font-mono text-[11px] text-atc-text">
          {!distanceDisplay ? (
            <NumberWithUnit text="-" unit="" />
          ) : distanceDisplay.text ? (
            <NumberWithUnit text={distanceDisplay.text} unit={distanceDisplay.unit} />
          ) : (
            <NumberWithUnit value={distanceDisplay.value} unit={distanceDisplay.unit} />
          )}
        </div>

        <div className="aircraft-table-subline flex min-h-[12px] min-w-0 items-center gap-1.5 self-center text-[10px] text-atc-faint">
          {flag ? (
            <span aria-hidden="true" className="flex-none leading-none">
              {flag}
            </span>
          ) : null}
          {country ? <span className="min-w-0 truncate">{country}</span> : null}
        </div>
        <div className="aircraft-table-metric aircraft-table-metric--altitude self-center text-right font-mono text-[11px] text-atc-dim">
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
        className="aircraft-table-unit notranslate relative top-[0.22em] block text-left text-[7px] leading-none text-atc-dim"
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
