"use client";

import { useEffect, useRef, useState } from "react";
import NumberFlow from "@number-flow/react";
import { formatFlightRouteMunicipalityLabel } from "../../utils/flightRouteDisplay.js";

export default function AircraftRow({
  aircraft,
  aircraftId,
  emphasis,
  selected,
  onSelectAircraft,
}) {
  const callsign = aircraft.callsign?.trim() || aircraft.icao24 || "-";
  const route = aircraft.flightRouteLabel || "";
  const routeMunicipalities = formatFlightRouteMunicipalityLabel(
    aircraft.flightRoute,
  );
  const hasRouteMunicipalities = Boolean(
    routeMunicipalities && routeMunicipalities !== route,
  );
  const gsValue = toNumber(aircraft.velocity);
  const altValue = toNumber(aircraft.altitude);
  const rowOpacity = selected ? 1 : emphasis.opacity;

  return (
    <button
      type="button"
      className={`aircraft-table-card grid w-full grid-cols-[minmax(0,1fr)_54px_70px] items-center gap-3 px-[var(--airport-sidebar-inset)] text-left transition-[background,color,opacity] hover:bg-[color-mix(in_oklab,var(--atc-elev)_55%,transparent)] ${
        selected ? "bg-[color-mix(in_oklab,var(--atc-accent)_11%,transparent)]" : ""
      }`}
      style={{ "--aircraft-row-opacity": rowOpacity }}
      aria-pressed={selected}
      onClick={() => aircraftId && onSelectAircraft?.(aircraftId)}
    >
      <AircraftIdentityCell
        callsign={callsign}
        route={route}
        routeMunicipalities={routeMunicipalities}
        hasRouteMunicipalities={hasRouteMunicipalities}
      />
      <div className="text-right font-mono text-[12px] font-semibold text-atc-text">
        {gsValue == null ? (
          <span>-</span>
        ) : (
          <NumberWithUnit value={Math.round(gsValue)} unit="KT" />
        )}
      </div>
      <div className="text-right font-mono text-[12px] font-semibold text-atc-text">
        {aircraft.onGround ? (
          <span>GND</span>
        ) : altValue == null ? (
          <span>-</span>
        ) : (
          <NumberWithUnit value={Math.round(altValue)} unit="FT" />
        )}
      </div>
    </button>
  );
}

function AircraftIdentityCell({
  callsign,
  route,
  routeMunicipalities,
  hasRouteMunicipalities,
}) {
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
        <span className="aircraft-table-callsign airport-sidebar-display-mono truncate text-[12px] font-semibold text-atc-text">
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
      <span className="aircraft-table-callsign airport-sidebar-display-mono truncate text-[12px] font-semibold text-atc-text">
        {callsign}
      </span>
      <div className="aircraft-table-route-slot flex min-w-0 items-center">
        <div
          className={`aircraft-table-route-cycle min-w-0 flex-1 ${
            hasRouteMunicipalities ? "aircraft-table-route-cycle--alternate" : ""
          }`}
        >
          {hasRouteMunicipalities && (
            <div className="aircraft-table-route-face aircraft-table-route-face--flight">
              <span className="truncate text-[9.5px]">
                {routeMunicipalities}
              </span>
            </div>
          )}
          <div className="aircraft-table-route-face aircraft-table-route-face--route">
            <span className="truncate text-[9.5px]">{route}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function NumberWithUnit({ value, unit }) {
  return (
    <span
      className="inline-flex items-baseline justify-end gap-0.5 tabular-nums"
      style={{ isolation: "isolate", willChange: "contents" }}
    >
      <NumberFlow value={value} />
      <sub className="relative top-[0.22em] text-[7px] font-semibold leading-none text-atc-dim">
        {unit}
      </sub>
    </span>
  );
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
