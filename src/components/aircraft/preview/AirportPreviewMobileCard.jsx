"use client";

import NumberFlow from "@number-flow/react";
import { countryName, flagEmoji } from "@/utils/flag.js";
import { toFiniteNumber } from "@/utils/math.js";

// Airport variant of the bottom-of-screen mobile preview card. Mirrors
// the AircraftPreviewMobileCard column rhythm so swapping between an
// aircraft selection and an airport selection on mobile doesn't change
// the card's shape.
export default function AirportPreviewMobileCard({ airport }) {
  const icao = (airport?.icao || "").trim().toUpperCase();
  const iata = (airport?.iata || "").trim().toUpperCase();
  const codeLine = iata && iata !== icao ? `${iata} · ${icao}` : icao || "—";
  const flag = flagEmoji(airport?.country);
  const country = countryName(airport?.country) || airport?.country || "";
  const placeText = [airport?.city, country].filter(Boolean).join(", ");
  const placeLine = flag && placeText ? `${flag} ${placeText}` : placeText;
  const distance = toFiniteNumber(airport?.distanceNm);
  const elevation = toFiniteNumber(airport?.elevationFt);
  const hasStats = distance != null || elevation != null;

  return (
    <div className="aircraft-preview-mobile-card__inner">
      <div className="aircraft-preview-mobile-card__row1">
        <span className="aircraft-preview-mobile-card__callsign">
          {codeLine}
        </span>
        {placeLine && (
          <>
            <span className="aircraft-preview-mobile-card__sep">/</span>
            <span className="aircraft-preview-mobile-card__type">
              {placeLine}
            </span>
          </>
        )}
      </div>
      {hasStats && (
        <div className="aircraft-preview-mobile-card__row2">
          {distance != null && (
            <span className="aircraft-preview-mobile-card__stat">
              <NumberFlow
                value={distance}
                format={{ maximumFractionDigits: 1, minimumFractionDigits: 1 }}
                className="aircraft-preview-mobile-card__num"
              />
              <span className="aircraft-preview-mobile-card__unit">NM</span>
            </span>
          )}
          {elevation != null && (
            <>
              {distance != null && (
                <span className="aircraft-preview-mobile-card__dot">·</span>
              )}
              <span className="aircraft-preview-mobile-card__stat">
                <NumberFlow
                  value={Math.round(elevation)}
                  className="aircraft-preview-mobile-card__num"
                />
                <span className="aircraft-preview-mobile-card__unit">ft</span>
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
