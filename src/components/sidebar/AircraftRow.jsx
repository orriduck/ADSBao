/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import {
  formatFlightRouteMunicipalityLabel,
  getFlightRouteAirlineIconUrl,
} from "../../utils/flightRouteDisplay.js";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";

// Tiny self-contained <img> that hides itself if the URL 404s. Avoids
// stamped broken-image icons in dense list rows when the logo isn't
// served by the airline-icon CDN.
function AirlineLogo({ src, className }) {
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
}) {
  const { locale, t } = useI18n();
  const callsign = aircraft.callsign?.trim() || aircraft.icao24 || "-";
  const route = aircraft.flightRouteLabel || "";
  const airlineIconUrl = getFlightRouteAirlineIconUrl(aircraft.flightRoute);
  // Municipality labels come from OurAirports / adsbdb as English-only
  // city names ("Los Angeles → Seattle"). Localizing every world city
  // would need a separate dictionary; for now we drop the secondary line
  // in non-English locales and let the ICAO route ("KLAX → KSEA") stand
  // on its own — still unambiguous, just untranslated.
  const routeMunicipalities =
    locale === "en"
      ? formatFlightRouteMunicipalityLabel(aircraft.flightRoute)
      : "";
  const hasRouteMunicipalities = Boolean(
    routeMunicipalities && routeMunicipalities !== route,
  );
  const distValue = toNumber(aircraft.distanceNm);
  const altValue = toNumber(aircraft.altitude);

  return (
    <button
      type="button"
      className={`aircraft-table-card endf-industrial-row grid w-full grid-cols-[18px_minmax(0,1fr)_54px_70px] items-center gap-3 px-[var(--airport-sidebar-inset)] text-left transition-[background,color] hover:bg-[color-mix(in_oklab,var(--atc-elev)_55%,transparent)] ${
        selected ? "endf-row-active" : ""
      }`}
      aria-pressed={selected}
      onClick={() => aircraftId && onSelectAircraft?.(aircraftId)}
    >
      <span aria-hidden="true" className="endf-row-glyph" />
      <AircraftIdentityCell
        callsign={callsign}
        route={route}
        airlineIconUrl={airlineIconUrl}
        routeMunicipalities={routeMunicipalities}
        hasRouteMunicipalities={hasRouteMunicipalities}
      />
      <div className="text-right font-mono text-[12px] font-semibold text-atc-text">
        {distValue == null ? (
          <span>-</span>
        ) : (
          <NumberWithUnit
            value={distValue}
            unit="NM"
            format={{ maximumFractionDigits: 1, minimumFractionDigits: 1 }}
          />
        )}
      </div>
      <div className="text-right font-mono text-[12px] font-semibold text-atc-text">
        {aircraft.onGround ? (
          <span>{t("aircraft.gnd")}</span>
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
  airlineIconUrl,
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

// Plain-text formatter for list rows. NumberFlow's animated digits look
// great on a couple of metric cards, but rendering ~290 instances (145
// aircraft × 2 columns) every poll tick costs framerate. Static text
// via Intl.NumberFormat keeps locale-correct separators without the
// per-row custom-element overhead. We get a "value refreshed" feedback
// by keying the inner span on the formatted value — React remounts on
// change and the .number-fade CSS animation fades the new value in.
function NumberWithUnit({ value, unit, format }) {
  const formatted = new Intl.NumberFormat(undefined, format).format(value);
  return (
    <span className="inline-flex items-baseline justify-end gap-0.5 tabular-nums">
      <span key={formatted} className="number-fade">
        {formatted}
      </span>
      <sub
        className="notranslate relative top-[0.22em] text-[7px] font-semibold leading-none text-atc-dim"
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
