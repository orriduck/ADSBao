"use client";

import { useEffect, useState } from "react";
import { useMapInstance } from "./MapContext.js";

// Bottom-left adaptive scale bar (比例尺). Snaps to the largest "nice"
// NM step under TARGET_PX so the label doesn't flicker through
// arbitrary digits as the user zooms.

const METERS_PER_NM = 1852;
const TARGET_PX = 110;
const NICE_NM_STEPS = [
  1, 2, 3, 5, 10, 15, 20, 30, 50, 75, 100, 150, 200, 300, 500,
];

export default function MapRangeLegend({ theme = "dark" }) {
  const map = useMapInstance();
  const [scale, setScale] = useState(null);

  useEffect(() => {
    if (!map || typeof map.getContainer !== "function" || !map.getContainer()) {
      return undefined;
    }

    const update = () => {
      const size = map.getSize();
      if (!size?.x || !size?.y) return;
      const y = size.y / 2;
      const left = map.containerPointToLatLng([0, y]);
      const right = map.containerPointToLatLng([TARGET_PX, y]);
      const meters = map.distance(left, right);
      if (!Number.isFinite(meters) || meters <= 0) return;
      const nmPerPx = meters / METERS_PER_NM / TARGET_PX;
      const targetNm = nmPerPx * TARGET_PX;
      let chosen = NICE_NM_STEPS[0];
      for (const candidate of NICE_NM_STEPS) {
        if (candidate <= targetNm) chosen = candidate;
        else break;
      }
      setScale({ nm: chosen, widthPx: chosen / nmPerPx });
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

  if (!scale) return null;

  const isLight = theme === "light";
  const backdrop = isLight
    ? "bg-[rgba(250,249,245,0.45)]"
    : "bg-[rgba(8,12,20,0.4)]";
  const textTone = isLight ? "text-[#0e1a2b]" : "text-[#f5f7fa]";
  const labelTone = isLight ? "text-[#0e1a2b]/70" : "text-[#f5f7fa]/70";

  return (
    <div
      role="note"
      aria-label={`Map distance: ${scale.nm} nautical miles`}
      className={`pointer-events-none absolute bottom-3 left-3 z-[400] flex items-center gap-2 px-2 py-1 font-mono ${backdrop} ${textTone} backdrop-blur-sm`}
    >
      <span
        className={`text-[9px] font-semibold uppercase tracking-[0.22em] ${labelTone}`}
      >
        Distance
      </span>
      <div
        style={{ width: `${scale.widthPx}px` }}
        className="relative h-[10px]"
      >
        <span
          aria-hidden="true"
          className="absolute left-0 right-0 top-1/2 h-px bg-current opacity-70"
        />
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 h-full w-px bg-current"
        />
        <span
          aria-hidden="true"
          className="absolute right-0 top-0 h-full w-px bg-current"
        />
      </div>
      <span className="text-[10px] font-semibold tracking-[0.12em] tabular-nums">
        {scale.nm} <span className="notranslate" translate="no">NM</span>
      </span>
    </div>
  );
}
