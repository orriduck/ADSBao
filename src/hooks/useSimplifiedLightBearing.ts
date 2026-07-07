import { useEffect, useState } from "react";
import {
  resolveTimeOfDayBucket,
  simplifiedLightBearingDeg,
  type TimeOfDay,
} from "@/features/aircraft/canvas/aircraftAmbientModel";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

function resolveAmbientTimeSignal(nowMs: number, lonDeg: number) {
  return {
    lightBearingDeg: simplifiedLightBearingDeg(nowMs, lonDeg),
    timeOfDay: resolveTimeOfDayBucket(nowMs, lonDeg),
  };
}

/**
 * Tracks the two time-derived ambient signals the aircraft canvas layer
 * uses: the simplified (non-astronomical) light bearing for the highlight/
 * shadow mask, and the time-of-day colour-temperature bucket for the
 * weather-mood palette. Both are LOCATION-local (derived from `lonDeg`, not
 * the viewer's own device clock — see aircraftAmbientModel's resolveLocalHour)
 * so an airport the other side of the world doesn't render "night" colours
 * just because the viewer's own clock says so.
 *
 * Both only drift over hours, so one slow interval refreshes them together —
 * this deliberately does NOT hook into the per-frame motion loop; a state
 * update here just lets the next natural redraw pick up the new values. A
 * `lonDeg` change (e.g. navigating to a different airport) recomputes
 * immediately rather than waiting for the next interval tick.
 */
export function useSimplifiedLightBearing(lonDeg = 0): {
  lightBearingDeg: number;
  timeOfDay: TimeOfDay;
} {
  const [signal, setSignal] = useState(() =>
    resolveAmbientTimeSignal(Date.now(), lonDeg),
  );

  useEffect(() => {
    setSignal(resolveAmbientTimeSignal(Date.now(), lonDeg));
    const timer = window.setInterval(() => {
      setSignal(resolveAmbientTimeSignal(Date.now(), lonDeg));
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [lonDeg]);

  return signal;
}
