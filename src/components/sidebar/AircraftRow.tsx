import { memo } from "react";
import { Plane } from "lucide-react";
import { getFlightRouteAccuracyNotice } from "../../utils/flightRouteDisplay";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useUnitPreferences } from "@/features/app-shell/unitPreferences/UnitPreferencesProvider";
import { formatFlightTelemetryMetric } from "@/features/aircraft/tracking/flightTelemetryDisplayModel";
import { formatNearbyDistanceDisplay } from "@/features/aviation/distanceDisplayModel";
import { formatAltitude } from "@/utils/units";
import { useCardInteraction } from "@/animations/useCardInteraction";
import { rowPropsEqual } from "./rowPropsEqual";

// Vertical-rate deadband: below this the aircraft reads as level and gets no
// climb/descend cue, so cruise noise doesn't flicker an arrow on every row.
const VERTICAL_CUE_FPM = 64;

function verticalCue(aircraft: Record<string, any>) {
  if (aircraft?.onGround) return "";
  const rate = Number(aircraft?.baroRate);
  if (!Number.isFinite(rate) || Math.abs(rate) < VERTICAL_CUE_FPM) return "";
  return rate > 0 ? "▲" : "▼";
}

// Single-line row: [glyph] callsign · route … distance / altitude. Distance and
// altitude share one compact tabular group on the right and are told apart by
// luminance (distance recedes to faint, altitude holds dim) rather than by a
// second line. The row is a fixed height so the virtualized list never jitters
// between routed and un-routed entries.
function AircraftRow({
  aircraft,
  aircraftId,
  selected,
  onSelectAircraft,
}: Record<string, any>) {
  const { t } = useI18n();
  // Press feedback only — the row already changes background on hover, so a
  // hover lift would jitter the dense list; GSAP owns transform (the CSS
  // transition below intentionally omits it).
  const { ref, onMouseDown, onMouseUp, onMouseLeave } = useCardInteraction({
    hoverScale: 1,
    hoverY: 0,
    pressScale: 0.985,
  });
  const { preferences: units } = useUnitPreferences();
  const callsign = aircraft.callsign?.trim() || aircraft.icao24 || "-";
  const route = aircraft.flightRouteLabel || "";
  const registration = String(aircraft.registration || "").trim();
  const routeAccuracyNotice = getFlightRouteAccuracyNotice(aircraft.flightRoute)
    ? t("aircraft.adsbdbRouteAccuracyNotice")
    : "";
  const routeTitle = routeAccuracyNotice || route;

  const distValue = toNumber(aircraft.distanceNm);
  const distanceDisplay = formatNearbyDistanceDisplay(distValue, units.distance);
  const distanceMain = distanceDisplay
    ? (distanceDisplay.text ?? distanceDisplay.value)
    : "—";
  const distanceUnit = distanceDisplay?.unit || "";

  const rawAltitude = formatFlightTelemetryMetric({
    metric: "altitude",
    value: aircraft.altitude,
    onGround: aircraft.onGround,
    flightPositionSource: aircraft.flight_position_source,
    positionQuality: aircraft.positionQuality,
  });
  const altitudeDisplay = rawAltitude
    ? formatAltitude(aircraft.altitude, units.altitude, { kind: "cruise" })
    : null;
  const cue = verticalCue(aircraft);

  return (
    <button
      type="button"
      ref={ref}
      data-selected={selected ? "true" : undefined}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      className={`aircraft-table-card aircraft-table-row-shell flex w-full items-center gap-2.5 px-[var(--airport-sidebar-inset)] text-left transition-[background,color,box-shadow] hover:bg-[color-mix(in_oklab,var(--atc-elev)_55%,transparent)] data-[selected=true]:bg-[color-mix(in_oklab,var(--atc-signal-accent)_12%,transparent)] data-[selected=true]:shadow-[inset_2px_0_0_var(--atc-signal-accent)] data-[selected=true]:hover:bg-[color-mix(in_oklab,var(--atc-signal-accent)_15%,transparent)] data-[selected=true]:[&_.aircraft-table-row-glyph]:text-[var(--atc-signal-accent)] ${
        selected ? "aircraft-table-row--selected aircraft-table-row--active" : ""
      }`}
      aria-pressed={selected}
      onClick={() => aircraftId && onSelectAircraft?.(aircraftId)}
    >
      <span aria-hidden="true" className="aircraft-table-row-glyph">
        <Plane size={13} strokeWidth={2.4} />
      </span>

      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        <span
          className="aircraft-table-callsign airport-sidebar-display-mono notranslate shrink-0 text-[calc(12.5px*var(--sb-body-scale))] text-atc-text"
          translate="no"
        >
          {callsign}
        </span>
        {route ? (
          <span
            title={routeTitle}
            className="notranslate min-w-0 truncate text-[calc(10.5px*var(--sb-body-scale))] text-atc-faint"
            translate="no"
          >
            {route}
          </span>
        ) : registration && registration !== callsign ? (
          <span
            className="notranslate min-w-0 truncate text-[calc(10px*var(--sb-body-scale))] tracking-[0.04em] text-atc-faint"
            translate="no"
          >
            {registration}
          </span>
        ) : null}
      </div>

      <div className="flex flex-none items-baseline gap-2.5 font-mono tabular-nums">
        <span className="text-[calc(11px*var(--sb-body-scale))] text-atc-faint">
          {distanceMain}
          {distanceUnit ? (
            <span className="ml-0.5 text-[calc(7.5px*var(--sb-body-scale))] text-atc-faint">
              {distanceUnit}
            </span>
          ) : null}
        </span>
        <span className="flex items-baseline gap-0.5 text-[calc(11px*var(--sb-body-scale))] text-atc-text">
          {cue ? (
            <span
              aria-hidden="true"
              className="text-[calc(8px*var(--sb-body-scale))] leading-none text-atc-faint"
            >
              {cue}
            </span>
          ) : null}
          {aircraft.onGround ? (
            <span>{t("aircraft.gnd")}</span>
          ) : !rawAltitude || !altitudeDisplay ? (
            <span>—</span>
          ) : (
            <>
              {altitudeDisplay.prefix ? (
                <span className="notranslate text-atc-faint" translate="no">
                  {altitudeDisplay.prefix}
                </span>
              ) : null}
              {altitudeDisplay.value}
              <span className="ml-0.5 text-[calc(7.5px*var(--sb-body-scale))] text-atc-faint">
                {String(altitudeDisplay.unit).toUpperCase()}
              </span>
            </>
          )}
        </span>
      </div>
    </button>
  );
}

// Memoized so a poll tick only re-renders rows whose displayed fields
// actually changed (the pipeline hands down fresh object identities every
// tick, so the compare is field-based — see rowPropsEqual).
export default memo(AircraftRow, (prev, next) =>
  rowPropsEqual(prev, next, {
    scalarKeys: ["selected", "aircraftId", "onSelectAircraft"],
    nestedKey: "aircraft",
    nestedFields: [
      "callsign",
      "icao24",
      "registration",
      "flightRouteLabel",
      "flightRoute",
      "distanceNm",
      "altitude",
      "baroRate",
      "onGround",
      "flight_position_source",
      "positionQuality",
    ],
  }),
);

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
