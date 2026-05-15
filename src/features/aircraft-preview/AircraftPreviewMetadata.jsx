"use client";

import { toFiniteNumber } from "../../utils/math.js";

// Slower-changing identity + spatial metadata: hex, track, and distance
// from the focal airport. Lives below telemetry so the eye reads "what
// is it doing now" before "what is it".
export default function AircraftPreviewMetadata({ aircraft }) {
  const hex = aircraft?.icao24 ? aircraft.icao24.toUpperCase() : "—";
  const track = toFiniteNumber(aircraft?.track);
  const distance = toFiniteNumber(aircraft?.distanceNm);

  return (
    <dl className="aircraft-preview-metadata">
      <MetaRow label="HEX" value={hex} />
      <MetaRow
        label="TRK"
        value={track != null ? `${Math.round(track)}°` : "—"}
      />
      {distance != null && (
        <MetaRow label="DIST" value={`${distance.toFixed(1)} NM`} />
      )}
    </dl>
  );
}

function MetaRow({ label, value }) {
  return (
    <div className="aircraft-preview-meta-row">
      <dt className="aircraft-preview-meta-row__label">{label}</dt>
      <dd className="aircraft-preview-meta-row__value">{value}</dd>
    </div>
  );
}
