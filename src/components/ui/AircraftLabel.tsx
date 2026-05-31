"use client";

// Callsign / aircraft-ID label that floats next to a Leaflet aircraft
// marker on the map. Pulled out of AircraftPosition.jsx so the same
// rendering shape (callsign + optional source-quality badge in the
// brand color) is reusable from other map layers if needed.

export function AircraftLabel({
  color,
  label,
  sourceBadge = null,
  left,
  top = 2,
}) {
  return (
    <div
      className="aircraft-label"
      style={{ left: `${left}px`, top: `${top}px`, color }}
    >
      <div className="aircraft-label-title">{label}</div>
      {sourceBadge ? (
        <div className="aircraft-label-title opacity-75">{sourceBadge}</div>
      ) : null}
    </div>
  );
}
