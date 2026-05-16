"use client";

// Aircraft type designator + ADS-B emitter category. Sits next to the
// silhouette in the card header. Falls back gracefully when one or both
// fields are missing — the row stays the same height either way.
export default function AircraftPreviewType({ aircraft }) {
  const type = (aircraft?.type || "").trim().toUpperCase();
  const category = (aircraft?.category || "").trim().toUpperCase();
  const primary = type || category || "Unknown type";
  const secondary = type && category ? category : null;

  return (
    <div className="aircraft-preview-type">
      <div className="aircraft-preview-type__code">{primary}</div>
      {secondary && (
        <div className="aircraft-preview-type__category">{secondary}</div>
      )}
    </div>
  );
}
