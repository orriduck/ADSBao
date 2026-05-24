/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import NumberFlow from "@number-flow/react";
import { toFiniteNumber } from "@/utils/math.js";
import { getFlightRouteAirlineIconUrl } from "@/utils/flightRouteDisplay.js";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";
import SocialActivitySummary from "@/components/social/SocialActivitySummary.jsx";

// Same self-hiding-on-error pattern as the list row's logo. Keeps the
// mobile card tidy when an airline isn't covered by the icon CDN.
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

export default function AircraftPreviewMobileCard({ aircraft, socialSummary = null }) {
  const { t } = useI18n();
  const callsign =
    (aircraft?.callsign || "").trim() || aircraft?.icao24?.toUpperCase() || "—";
  const type = (aircraft?.type || "").trim().toUpperCase();
  const route = aircraft?.flightRouteLabel || "";
  const airlineIconUrl = getFlightRouteAirlineIconUrl(aircraft?.flightRoute);

  const speed = toFiniteNumber(aircraft?.velocity);
  const altitude = toFiniteNumber(aircraft?.altitude);
  const vs = toFiniteNumber(aircraft?.baroRate);
  const onGround = Boolean(aircraft?.onGround);

  const hasStats = speed != null || altitude != null || vs != null || onGround;

  return (
    <div className="aircraft-preview-mobile-card__inner">
      <div className="aircraft-preview-mobile-card__row1">
        <span
          className="aircraft-preview-mobile-card__callsign notranslate"
          translate="no"
        >
          {callsign}
        </span>
        {type && (
          <>
            <span className="aircraft-preview-mobile-card__sep">/</span>
            <span
              className="aircraft-preview-mobile-card__type notranslate"
              translate="no"
            >
              {type}
            </span>
          </>
        )}
      </div>
      {route && (
        <div
          className="aircraft-preview-mobile-card__route notranslate"
          translate="no"
        >
          <AirlineLogo
            src={airlineIconUrl}
            className="aircraft-preview-mobile-card__airline-logo"
          />
          <span className="aircraft-preview-mobile-card__route-text">
            {route}
          </span>
        </div>
      )}
      <SocialActivitySummary summary={socialSummary} compact />
      {hasStats && (
        <div className="aircraft-preview-mobile-card__row2">
          {speed != null && (
            <span className="aircraft-preview-mobile-card__stat">
              <NumberFlow value={Math.round(speed)} className="aircraft-preview-mobile-card__num" />
              <span
                className="aircraft-preview-mobile-card__unit notranslate"
                translate="no"
              >
                kt
              </span>
            </span>
          )}
          {(altitude != null || onGround) && (
            <>
              <span className="aircraft-preview-mobile-card__dot">·</span>
              <span className="aircraft-preview-mobile-card__stat">
                {onGround ? (
                  <span className="aircraft-preview-mobile-card__num">
                    {t("aircraft.gnd")}
                  </span>
                ) : (
                  <NumberFlow value={Math.round(altitude)} className="aircraft-preview-mobile-card__num" />
                )}
                {!onGround && (
                  <span
                    className="aircraft-preview-mobile-card__unit notranslate"
                    translate="no"
                  >
                    ft
                  </span>
                )}
              </span>
            </>
          )}
          {vs != null && (
            <>
              <span className="aircraft-preview-mobile-card__dot">·</span>
              <span className="aircraft-preview-mobile-card__stat">
                <NumberFlow
                  value={Math.round(vs)}
                  format={{ signDisplay: "exceptZero" }}
                  className="aircraft-preview-mobile-card__num"
                />
                <span
                  className="aircraft-preview-mobile-card__unit notranslate"
                  translate="no"
                >
                  fpm
                </span>
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
