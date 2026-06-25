import { memo, useEffect, useRef, useState } from "react";
import { Plane } from "lucide-react";
import {
  getFlightRouteAccuracyNotice,
  getFlightRouteAirlineIconUrl,
} from "../../utils/flightRouteDisplay";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useUnitPreferences } from "@/features/app-shell/unitPreferences/UnitPreferencesProvider";
import { formatFlightTelemetryMetric } from "@/features/aircraft/tracking/flightTelemetryDisplayModel";
import { formatNearbyDistanceDisplay } from "@/features/aviation/distanceDisplayModel";
import { formatAltitude } from "@/utils/units";
import { useCardInteraction } from "@/animations/useCardInteraction";
import { rowPropsEqual } from "./rowPropsEqual";

const ROUTE_ENTER_MS = 300;

// Tiny self-contained <img> that hides itself if the URL 404s. Avoids
// stamped broken-image icons in dense list rows when the logo isn't
// served by the airline-icon CDN.
function AirlineLogo({ src, className }: Record<string, any>) {
  const [hidden, setHidden] = useState(false);
  if (!src || hidden) return null;
  return (
    <img
      src={src}
      alt=""
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setHidden(true)}
    />
  );
}

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
  const airlineIconUrl = getFlightRouteAirlineIconUrl(aircraft.flightRoute);
  const routeAccuracyNotice = getFlightRouteAccuracyNotice(aircraft.flightRoute)
    ? t("aircraft.adsbdbRouteAccuracyNotice")
    : "";
  const distValue = toNumber(aircraft.distanceNm);
  const distanceDisplay = formatNearbyDistanceDisplay(distValue, units.distance);
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

  return (
    <button
      type="button"
      ref={ref}
      data-selected={selected ? "true" : undefined}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      className={`aircraft-table-card aircraft-table-row-grid aircraft-table-row-shell grid w-full items-center px-[var(--airport-sidebar-inset)] text-left transition-[background,color,box-shadow] hover:bg-[color-mix(in_oklab,var(--atc-elev)_55%,transparent)] data-[selected=true]:bg-[color-mix(in_oklab,var(--atc-signal-accent)_12%,transparent)] data-[selected=true]:shadow-[inset_2px_0_0_var(--atc-signal-accent)] data-[selected=true]:hover:bg-[color-mix(in_oklab,var(--atc-signal-accent)_15%,transparent)] data-[selected=true]:[&_.aircraft-table-row-glyph]:text-[var(--atc-signal-accent)] ${
        selected ? "aircraft-table-row--selected aircraft-table-row--active" : ""
      }`}
      aria-pressed={selected}
      onClick={() => aircraftId && onSelectAircraft?.(aircraftId)}
    >
      <span aria-hidden="true" className="aircraft-table-row-glyph">
        <Plane size={13} strokeWidth={2.4} />
      </span>
      <AircraftIdentityCell
        callsign={callsign}
        route={route}
        airlineIconUrl={airlineIconUrl}
        routeAccuracyNotice={routeAccuracyNotice}
      />
      <div className="aircraft-table-cell aircraft-table-cell--distance text-right font-mono text-[12px] font-semibold text-atc-text">
        {!distanceDisplay ? (
          <NumberWithUnit text="-" unit="" />
        ) : distanceDisplay.text ? (
          <NumberWithUnit
            text={distanceDisplay.text}
            unit={distanceDisplay.unit}
          />
        ) : (
          <NumberWithUnit
            value={distanceDisplay.value}
            unit={distanceDisplay.unit}
          />
        )}
      </div>
      <div className="aircraft-table-cell aircraft-table-cell--altitude text-right font-mono text-[12px] font-semibold text-atc-text">
        {aircraft.onGround ? (
          <NumberWithUnit text={t("aircraft.gnd")} unit="" />
        ) : !altitudeDisplay ? (
          <NumberWithUnit text="-" unit="" />
        ) : (
          <NumberWithUnit
            value={altitudeDisplay.value}
            unit={altitudeDisplay.unit.toUpperCase()}
            prefix={altitudeDisplay.prefix}
          />
        )}
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
      "flightRouteLabel",
      "flightRoute",
      "distanceNm",
      "altitude",
      "onGround",
      "flight_position_source",
      "positionQuality",
    ],
  }),
);

function AircraftIdentityCell({
  callsign,
  route,
  airlineIconUrl,
  routeAccuracyNotice,
}: Record<string, any>) {
  const hasRoute = Boolean(route);
  const hadRoute = useRef(hasRoute);
  const [routeEntering, setRouteEntering] = useState(false);

  useEffect(() => {
    if (!hadRoute.current && hasRoute) {
      setRouteEntering(true);
      const timer = window.setTimeout(
        () => setRouteEntering(false),
        ROUTE_ENTER_MS,
      );
      hadRoute.current = hasRoute;
      return () => window.clearTimeout(timer);
    }

    hadRoute.current = hasRoute;
    setRouteEntering(false);
    return undefined;
  }, [hasRoute, route]);

  if (!hasRoute) {
    return (
      <div className="aircraft-table-identity aircraft-table-identity--solo min-w-0">
        <span
          className="aircraft-table-callsign airport-sidebar-display-mono notranslate truncate text-[12px] font-semibold text-atc-text"
          translate="no"
        >
          {callsign}
        </span>
      </div>
    );
  }

  const routeTitle = routeAccuracyNotice || route;

  return (
    <div
      className={`aircraft-table-identity aircraft-table-identity--routed min-w-0 ${
        routeEntering ? "aircraft-table-identity--route-entering" : ""
      }`}
    >
      <div className="aircraft-table-primary-line flex min-w-0 items-center gap-1.5">
        <span
          className="aircraft-table-callsign airport-sidebar-display-mono notranslate min-w-0 truncate text-[12px] font-semibold text-atc-text"
          translate="no"
        >
          {callsign}
        </span>
        <AirlineLogo
          src={airlineIconUrl}
          className="aircraft-table-airline-logo"
        />
        <span
          title={routeTitle}
          className="aircraft-table-route-badge notranslate min-w-0 truncate"
          translate="no"
        >
          {route}
        </span>
      </div>
    </div>
  );
}

function NumberWithUnit({ value, unit, format, text, prefix }: Record<string, any>) {
  const displayText =
    text ?? format?.format?.(Number(value)) ?? String(value ?? "");
  const hasUnit = Boolean(unit);

  if (!hasUnit) {
    // Mirror the unit branch's 2-column grid (number col + unit col) with an
    // empty unit cell, so unitless values (— / GND, e.g. the focal aircraft
    // after selecting it) right-align on the SAME axis as numeric values
    // instead of shifting to the cell's far edge.
    return (
      <span className="aircraft-table-number aircraft-table-number--unitless grid w-full min-w-0 grid-cols-[minmax(0,1fr)_var(--aircraft-table-unit-width,14px)] items-baseline gap-x-0.5 tabular-nums">
        <span className="flex min-w-0 items-baseline justify-end">
          {prefix ? (
            <span className="notranslate flex-none text-atc-dim" translate="no">
              {prefix}
            </span>
          ) : null}
          <span className="block min-w-0 text-right">{displayText}</span>
        </span>
        <span aria-hidden="true" />
      </span>
    );
  }

  return (
    <span className="aircraft-table-number grid w-full grid-cols-[minmax(0,1fr)_var(--aircraft-table-unit-width,14px)] items-baseline gap-x-0.5 tabular-nums">
      <span className="flex min-w-0 items-baseline justify-end">
        {prefix ? (
          <span className="notranslate flex-none text-atc-dim" translate="no">
            {prefix}
          </span>
        ) : null}
        <span className="block min-w-0 text-right">{displayText}</span>
      </span>
      <sub
        className="aircraft-table-unit notranslate relative top-[0.22em] block text-left text-[7px] font-semibold leading-none text-atc-dim"
        translate="no"
      >
        {unit}
      </sub>
    </span>
  );
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
