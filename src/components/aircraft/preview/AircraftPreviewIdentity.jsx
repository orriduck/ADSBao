/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import AircraftPreviewType from "./AircraftPreviewType.jsx";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";
import { getFlightRouteAirlineIconUrl } from "@/utils/flightRouteDisplay.js";

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

// Callsign + parsed route. Mirrors the sidebar row's identity cell so the
// hover state feels like a richer continuation rather than new data.
export default function AircraftPreviewIdentity({ aircraft }) {
  const { t } = useI18n();
  const callsign =
    (aircraft?.callsign || "").trim() || aircraft?.icao24?.toUpperCase() || "—";
  const route = aircraft?.flightRouteLabel || "";
  const airlineIconUrl = getFlightRouteAirlineIconUrl(aircraft?.flightRoute);

  return (
    <div className="aircraft-preview-identity">
      <div className="aircraft-preview-identity__top">
        <span
          className="aircraft-preview-identity__callsign notranslate"
          translate="no"
        >
          {callsign}
        </span>
        <AircraftPreviewType aircraft={aircraft} />
      </div>
      {route ? (
        <span
          className="aircraft-preview-identity__route notranslate"
          translate="no"
        >
          <AirlineLogo
            src={airlineIconUrl}
            className="aircraft-preview-identity__airline-logo"
          />
          {route}
        </span>
      ) : (
        <span className="aircraft-preview-identity__route aircraft-preview-identity__route--empty">
          {t("aircraft.noRoute")}
        </span>
      )}
    </div>
  );
}
