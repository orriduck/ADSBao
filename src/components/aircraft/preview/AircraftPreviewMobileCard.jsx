"use client";

import NumberFlow from "@number-flow/react";
import { toFiniteNumber } from "@/utils/math.js";

export default function AircraftPreviewMobileCard({ aircraft }) {
  const callsign =
    (aircraft?.callsign || "").trim() || aircraft?.icao24?.toUpperCase() || "—";
  const type = (aircraft?.type || "").trim().toUpperCase();

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
                  <span className="aircraft-preview-mobile-card__num">GND</span>
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
