import { useEffect, useState } from "react";
import {
  resolveTimeOfDayBucket,
  simplifiedLightBearingDeg,
  type TimeOfDay,
} from "@/features/aircraft/canvas/aircraftAmbientModel";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

function resolveAmbientTimeSignal(nowMs: number) {
  return {
    lightBearingDeg: simplifiedLightBearingDeg(nowMs),
    timeOfDay: resolveTimeOfDayBucket(nowMs),
  };
}

/**
 * Tracks the two time-derived ambient signals the aircraft canvas layer
 * uses: the simplified (non-astronomical) light bearing for the highlight/
 * shadow mask, and the time-of-day colour-temperature bucket for the
 * weather-mood palette. Both only drift over hours, so one slow interval
 * refreshes them together — this deliberately does NOT hook into the
 * per-frame motion loop; a state update here just lets the next natural
 * redraw pick up the new values.
 */
export function useSimplifiedLightBearing(): {
  lightBearingDeg: number;
  timeOfDay: TimeOfDay;
} {
  const [signal, setSignal] = useState(() => resolveAmbientTimeSignal(Date.now()));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSignal(resolveAmbientTimeSignal(Date.now()));
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  return signal;
}
