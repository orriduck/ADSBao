import { useEffect, useState } from "react";
import { simplifiedLightBearingDeg } from "@/features/aircraft/canvas/aircraftAmbientModel";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Tracks the simplified (non-astronomical) ambient light bearing used by the
 * aircraft canvas layer's light-direction shading. The underlying value only
 * drifts over hours, so a slow interval is enough — this deliberately does
 * NOT hook into the per-frame motion loop; a state update here just lets the
 * next natural redraw pick up the new bearing.
 */
export function useSimplifiedLightBearing(): number {
  const [bearingDeg, setBearingDeg] = useState(() =>
    simplifiedLightBearingDeg(Date.now()),
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setBearingDeg(simplifiedLightBearingDeg(Date.now()));
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  return bearingDeg;
}
