import { memo } from "react";
import { TowerControl } from "lucide-react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useUnitPreferences } from "@/features/app-shell/unitPreferences/UnitPreferencesProvider";
import { formatNearbyDistanceDisplay } from "@/features/aviation/distanceDisplayModel";
import { airportDisplayCodeLine } from "@/utils/airport";
import { countryName, flagEmoji } from "@/utils/flag";
import { formatAltitude } from "@/utils/units";
import { rowPropsEqual } from "./rowPropsEqual";

// Airport equivalent of AircraftRow — same single-line, fixed-height rhythm
// so an "airports & aircraft" mixed list reads as one coherent table:
// [glyph] ICAO·IATA  country … distance / elevation. The full "City, Country"
// lives in the preview card, not the compact row.
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
      className={`aircraft-table-card aircraft-table-row-shell flex w-full items-center gap-2.5 px-[var(--airport-sidebar-inset)] text-left transition-[background,color,box-shadow] hover:bg-[color-mix(in_oklab,var(--atc-elev)_55%,transparent)] data-[selected=true]:bg-[color-mix(in_oklab,var(--atc-signal-accent)_12%,transparent)] data-[selected=true]:shadow-[inset_2px_0_0_var(--atc-signal-accent)] data-[selected=true]:hover:bg-[color-mix(in_oklab,var(--atc-signal-accent)_15%,transparent)] data-[selected=true]:[&_.aircraft-table-row-glyph]:text-[var(--atc-signal-accent)] ${
        selected ? "aircraft-table-row--selected aircraft-table-row--active" : ""
      }`}
      data-selected={selected ? "true" : undefined}
      aria-pressed={selected}
      onClick={() => airportId && onSelectAirport?.(airportId)}
    >
      <span aria-hidden="true" className="aircraft-table-row-glyph">
        <TowerControl size={13} strokeWidth={2.4} />
      </span>

      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        <span
          className="aircraft-table-callsign airport-sidebar-display-mono notranslate shrink-0 text-[12.5px] text-atc-text"
          translate="no"
        >
          {code}
        </span>
        <span className="flex min-w-0 items-baseline gap-1 text-[10.5px] text-atc-faint">
          {flag ? (
            <span aria-hidden="true" className="flex-none leading-none">
              {flag}
            </span>
          ) : null}
          {country ? <span className="min-w-0 truncate">{country}</span> : null}
        </span>
      </div>

      <div className="flex flex-none items-baseline gap-2.5 font-mono tabular-nums">
        <span className="text-[11px] text-atc-faint">
          {distanceDisplay ? (distanceDisplay.text ?? distanceDisplay.value) : "—"}
          {distanceDisplay?.unit ? (
            <span className="ml-0.5 text-[7.5px] text-atc-faint">
              {distanceDisplay.unit}
            </span>
          ) : null}
        </span>
        {endpointLabel ? (
          <span className="text-[9px] uppercase tracking-normal text-atc-dim">
            {endpointLabel}
          </span>
        ) : (
          <span className="text-[11px] text-atc-text">
            {elevationDisplay ? elevationDisplay.value : "—"}
            {elevationDisplay?.unit ? (
              <span className="ml-0.5 text-[7.5px] text-atc-faint">
                {elevationDisplay.unit.toUpperCase()}
              </span>
            ) : null}
          </span>
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
      "country",
      "distanceNm",
      "elevationFt",
      "routeEndpointRole",
    ],
  }),
);

function toFiniteNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeEndpointRole(value: unknown) {
  const role = String(value || "").trim().toLowerCase();
  return role === "origin" || role === "destination" ? role : "";
}
