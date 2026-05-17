"use client";

// Bottom-left overlay on the airport map that explains the distance
// ring band when the map is zoomed out enough that per-ring labels
// would clutter. Shown only at approach-level zoom and below.
//
// Always rendered as a small text card so the user can still resolve
// "what does each ring mean" when they can't tell 3nm and 6nm apart
// visually. AreaMarker keeps the inline labels for closer zooms.

const LEGEND_MAX_ZOOM = 11;

export default function MapRangeLegend({
  zoom,
  focal = null,
  nearby = null,
}) {
  if (Number(zoom) > LEGEND_MAX_ZOOM) return null;
  const focalInterval = focal?.intervalNm;
  const focalMax = focal?.maxNm;
  const nearbyInterval = nearby?.intervalNm;
  const nearbyMax = nearby?.maxNm;
  if (!Number.isFinite(focalInterval) && !Number.isFinite(nearbyInterval)) {
    return null;
  }

  return (
    <div
      role="note"
      aria-label="Range rings legend"
      className="pointer-events-none absolute bottom-3 left-3 z-[400] flex flex-col gap-1 rounded-md border border-[var(--atc-line-strong)] bg-[color-mix(in_oklab,var(--atc-card)_92%,transparent)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-atc-dim shadow-lg backdrop-blur-sm"
    >
      <span className="text-[9px] font-semibold tracking-[0.22em] text-atc-faint">
        Range rings
      </span>
      {Number.isFinite(focalInterval) && Number.isFinite(focalMax) ? (
        <span className="flex items-center gap-1.5 text-atc-text">
          <Swatch tone="major" />
          {focalInterval} NM each · {focalMax} NM max
        </span>
      ) : null}
      {Number.isFinite(nearbyInterval) && Number.isFinite(nearbyMax) ? (
        <span className="flex items-center gap-1.5 text-atc-dim">
          <Swatch tone="minor" />
          Nearby {nearbyInterval} NM · {nearbyMax} NM max
        </span>
      ) : null}
    </div>
  );
}

function Swatch({ tone }) {
  const major = tone === "major";
  return (
    <span
      aria-hidden="true"
      className="inline-block h-2 w-2 rounded-full"
      style={{
        border: `${major ? "1.2px" : "0.8px"} dashed currentColor`,
        opacity: major ? 0.85 : 0.6,
      }}
    />
  );
}
