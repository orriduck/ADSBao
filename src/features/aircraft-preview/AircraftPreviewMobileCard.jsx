"use client";

import { toFiniteNumber } from "../../utils/math.js";

function formatSpeed(v) {
  const n = toFiniteNumber(v);
  return n != null ? `${Math.round(n)} kt` : null;
}

function formatAltitude(altitude, onGround) {
  if (onGround) return "GND";
  const n = toFiniteNumber(altitude);
  return n != null ? `${Math.round(n).toLocaleString()} ft` : null;
}

function formatVs(v) {
  const n = toFiniteNumber(v);
  if (n == null) return null;
  const rounded = Math.round(n);
  return `${rounded >= 0 ? "+" : ""}${rounded} fpm`;
}

export default function AircraftPreviewMobileCard({ aircraft }) {
  const callsign =
    (aircraft?.callsign || "").trim() || aircraft?.icao24?.toUpperCase() || "—";
  const type = (aircraft?.type || "").trim().toUpperCase();

  const speed = formatSpeed(aircraft?.velocity);
  const altitude = formatAltitude(aircraft?.altitude, aircraft?.onGround);
  const vs = formatVs(aircraft?.baroRate);
  const telemetryParts = [speed, altitude, vs].filter(Boolean);

  return (
    <div className="aircraft-preview-mobile-card__inner">
      <div className="aircraft-preview-mobile-card__row1">
        <span className="aircraft-preview-mobile-card__callsign">{callsign}</span>
        {type && (
          <>
            <span className="aircraft-preview-mobile-card__sep">/</span>
            <span className="aircraft-preview-mobile-card__type">{type}</span>
          </>
        )}
      </div>
      {telemetryParts.length > 0 && (
        <div className="aircraft-preview-mobile-card__row2">
          {telemetryParts.map((part, i) => (
            <span key={i} className="aircraft-preview-mobile-card__stat">
              {i > 0 && <span className="aircraft-preview-mobile-card__dot">·</span>}
              {part}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
