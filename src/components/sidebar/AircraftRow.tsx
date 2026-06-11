/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { Plane } from "lucide-react";
import NumberFlow from "@number-flow/react";
import {
  formatFlightRouteMunicipalityLabel,
  getFlightRouteAirlineIconUrl,
} from "../../utils/flightRouteDisplay";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useUnitPreferences } from "@/features/app-shell/unitPreferences/UnitPreferencesProvider";
import { formatFlightTelemetryMetric } from "@/features/aircraft/tracking/flightTelemetryDisplayModel";
import { formatNearbyDistanceDisplay } from "@/features/aviation/distanceDisplayModel";
import { formatAltitude } from "@/utils/units";
import { useCardInteraction } from "@/animations/useCardInteraction";

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

export default function AircraftRow({
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
  // Municipality labels come from route providers as source-data city names.
  // Keep them in every locale so the code/name cycle remains available.
  const routeMunicipalities = formatFlightRouteMunicipalityLabel(
    aircraft.flightRoute,
  );
  const hasRouteMunicipalities = Boolean(
    routeMunicipalities && routeMunicipalities !== route,
  );
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
      className={`aircraft-table-card aircraft-table-row-grid aircraft-table-row-shell grid w-full grid-cols-[18px_minmax(0,1fr)_48px_54px] items-center gap-2 px-[var(--airport-sidebar-inset)] text-left transition-[background,color,box-shadow] hover:bg-[color-mix(in_oklab,var(--atc-elev)_55%,transparent)] data-[selected=true]:[background:var(--atc-glass-active-bg)] data-[selected=true]:text-[var(--atc-click-fg)] data-[selected=true]:shadow-[var(--atc-glass-rim-shadow)] data-[selected=true]:[backdrop-filter:var(--atc-glass-active-frost)] data-[selected=true]:[-webkit-backdrop-filter:var(--atc-glass-active-frost)] data-[selected=true]:hover:[background:var(--atc-glass-active-bg)] data-[selected=true]:[&_.text-atc-text]:text-[var(--atc-click-fg)] data-[selected=true]:[&_.text-atc-dim]:text-[var(--atc-click-muted)] data-[selected=true]:[&_.text-atc-faint]:text-[var(--atc-click-muted)] data-[selected=true]:[&_.aircraft-table-route-cycle]:text-[var(--atc-click-muted)] data-[selected=true]:[&_.aircraft-table-row-glyph]:bg-[var(--atc-click-fg)] data-[selected=true]:[&_.aircraft-table-row-glyph]:text-[var(--atc-click-bg)] sm:grid-cols-[18px_minmax(0,1fr)_54px_70px] sm:gap-3 ${
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
        routeMunicipalities={routeMunicipalities}
        hasRouteMunicipalities={hasRouteMunicipalities}
      />
      <div className="aircraft-table-cell aircraft-table-cell--distance text-right font-mono text-[12px] font-semibold text-atc-text">
        {!distanceDisplay ? (
          <span>-</span>
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
          <span>{t("aircraft.gnd")}</span>
        ) : !altitudeDisplay ? (
          <span>-</span>
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

function AircraftIdentityCell({
  callsign,
  route,
  airlineIconUrl,
  routeMunicipalities,
  hasRouteMunicipalities,
}: Record<string, any>) {
  const hasRoute = Boolean(route);
  const hadRoute = useRef(hasRoute);
  const [routeEntering, setRouteEntering] = useState(false);

  useEffect(() => {
    if (!hadRoute.current && hasRoute) {
      setRouteEntering(true);
      const timer = window.setTimeout(() => setRouteEntering(false), 520);
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

  return (
    <div
      className={`aircraft-table-identity aircraft-table-identity--routed min-w-0 ${
        routeEntering ? "aircraft-table-identity--route-entering" : ""
      }`}
    >
      <span
        className="aircraft-table-callsign airport-sidebar-display-mono notranslate truncate text-[12px] font-semibold text-atc-text"
        translate="no"
      >
        {callsign}
      </span>
      <div className="aircraft-table-route-slot flex min-w-0 items-center">
        <AirlineLogo
          src={airlineIconUrl}
          className="aircraft-table-airline-logo"
        />
        <div
          className={`aircraft-table-route-cycle min-w-0 flex-1 ${
            hasRouteMunicipalities ? "aircraft-table-route-cycle--alternate" : ""
          }`}
        >
          {hasRouteMunicipalities && (
            <div className="aircraft-table-route-face aircraft-table-route-face--flight">
              <span className="notranslate truncate text-[9.5px]" translate="no">
                {routeMunicipalities}
              </span>
            </div>
          )}
          <div className="aircraft-table-route-face aircraft-table-route-face--route">
            <span className="notranslate truncate text-[9.5px]" translate="no">
              {route}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Animated numeric cell. NumberFlow handles digit-level animation natively,
// replacing the older static-text cross-fade. Cost is
// bounded by virtualization: only the rows in the visible window mount, so
// the previous ~290-instance worst case becomes ~24 (12 rows × 2 cells).
function NumberWithUnit({ value, unit, format, text, prefix }: Record<string, any>) {
  return (
    <span className="grid w-full grid-cols-[minmax(0,1fr)_var(--aircraft-table-unit-width,14px)] items-baseline gap-x-0.5 tabular-nums">
      <span className="flex min-w-0 items-baseline justify-end">
        {prefix ? (
          <span className="notranslate flex-none text-atc-dim" translate="no">
            {prefix}
          </span>
        ) : null}
        {text != null ? (
          <span className="block min-w-0 text-right">{text}</span>
        ) : (
          <NumberFlow
            value={value}
            format={format}
            className="block min-w-0 text-right"
          />
        )}
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
