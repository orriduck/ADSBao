"use client";

import { useEffect, useState } from "react";
import { useMapInstance } from "./MapContext.js";

// Bottom-left scale bar (比例尺) shown at approach-level zoom and
// below, when the inline per-ring labels would be too small to read.
// The bar adapts to the current map center + zoom and picks the
// largest "nice" nautical-mile value that fits within ~110 pixels.

const LEGEND_MAX_ZOOM = 11;
const METERS_PER_NM = 1852;
const TARGET_PX = 110;
// Ordered round numbers we'll snap the bar's length to. Avoids the
// scale label flickering through arbitrary digits as the user zooms.
const NICE_NM_STEPS = [1, 2, 3, 5, 10, 15, 20, 30, 50, 75, 100, 150, 200, 300, 500];

export default function MapRangeLegend({ zoom }) {
  const map = useMapInstance();
  const [scale, setScale] = useState(null);

  useEffect(() => {
    if (!map || typeof map.getContainer !== "function" || !map.getContainer()) {
      return undefined;
    }

    const update = () => {
      const size = map.getSize();
      if (!size?.x || !size?.y) return;
      // Measure how many meters the TARGET_PX-wide horizontal segment
      // spans at the vertical center of the viewport.
      const y = size.y / 2;
      const left = map.containerPointToLatLng([0, y]);
      const right = map.containerPointToLatLng([TARGET_PX, y]);
      const meters = map.distance(left, right);
      if (!Number.isFinite(meters) || meters <= 0) return;
      const nmPerPx = meters / METERS_PER_NM / TARGET_PX;
      const targetNm = nmPerPx * TARGET_PX;
      // Pick the largest nice step at or below the target.
      let chosen = NICE_NM_STEPS[0];
      for (const candidate of NICE_NM_STEPS) {
        if (candidate <= targetNm) chosen = candidate;
        else break;
      }
      const widthPx = chosen / nmPerPx;
      setScale({ nm: chosen, widthPx });
    };

    update();
    map.on("zoomend", update);
    map.on("moveend", update);
    map.on("resize", update);
    return () => {
      map.off("zoomend", update);
      map.off("moveend", update);
      map.off("resize", update);
    };
  }, [map]);

  if (Number(zoom) > LEGEND_MAX_ZOOM) return null;
  if (!scale) return null;

  return (
    <div
      role="note"
      aria-label={`Map scale: ${scale.nm} nautical miles`}
      className="pointer-events-none absolute bottom-3 left-3 z-[400] flex flex-col items-start gap-1 rounded-md border border-[var(--atc-line-strong)] bg-[color-mix(in_oklab,var(--atc-card)_92%,transparent)] px-3 py-2 font-mono text-atc-text shadow-lg backdrop-blur-sm"
    >
      <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-atc-faint">
        Scale
      </span>
      <div
        style={{ width: `${scale.widthPx}px` }}
        className="relative h-[10px]"
      >
        {/* Center baseline */}
        <span
          aria-hidden="true"
          className="absolute left-0 right-0 top-1/2 h-px bg-current opacity-60"
        />
        {/* End ticks */}
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 h-full w-px bg-current"
        />
        <span
          aria-hidden="true"
          className="absolute right-0 top-0 h-full w-px bg-current"
        />
      </div>
      <span className="text-[10px] font-semibold tracking-[0.12em] text-atc-text tabular-nums">
        {scale.nm} NM
      </span>
    </div>
  );
}
