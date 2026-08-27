import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  bootstrapTrackingRun,
  mergeTrackingObservations,
  readTrackingRunDelta,
  type TrackingObservation,
  type TrackingRun,
} from "@/features/aircraft/tracking/trackingRunClient";

const TRACKING_REFRESH_MS = 10_000;

export function useTrackingRun(callsign: string) {
  const [run, setRun] = useState<TrackingRun | null>(null);
  const [observations, setObservations] = useState<TrackingObservation[]>([]);
  const [error, setError] = useState<unknown>(null);
  const refreshRef = useRef<() => Promise<void>>(async () => undefined);
  const refresh = useCallback(() => refreshRef.current(), []);

  useEffect(() => {
    let disposed = false;
    let timer = 0;
    let inFlight: Promise<void> | null = null;
    let currentRun: TrackingRun | null = null;
    let currentCursor = "";
    let currentObservations: TrackingObservation[] = [];
    const controller = new AbortController();

    setRun(null);
    setObservations([]);
    setError(null);
    if (!callsign) {
      refreshRef.current = async () => undefined;
      return () => controller.abort();
    }

    const load = async () => {
      if (inFlight) return inFlight;
      inFlight = (async () => {
        try {
          const snapshot = currentRun
            ? await readTrackingRunDelta(currentRun, currentCursor, controller.signal)
            : await bootstrapTrackingRun(callsign, controller.signal);
          if (disposed) return;
          currentRun = snapshot.run;
          currentCursor = snapshot.observationCursor;
          currentObservations = currentRun && currentObservations.length > 0
            ? mergeTrackingObservations(currentObservations, snapshot.observations)
            : snapshot.observations;
          setRun(currentRun);
          setObservations(currentObservations);
          setError(null);
        } catch (nextError) {
          if (!disposed && !(nextError instanceof DOMException && nextError.name === "AbortError")) setError(nextError);
        }
      })().finally(() => { inFlight = null; });
      return inFlight;
    };
    refreshRef.current = load;
    const tick = async () => {
      await load();
      if (!disposed) timer = window.setTimeout(tick, TRACKING_REFRESH_MS);
    };
    void tick();
    return () => {
      disposed = true;
      controller.abort();
      window.clearTimeout(timer);
      refreshRef.current = async () => undefined;
    };
  }, [callsign]);

  const traceHistory = useMemo(
    () => observations.map(({ aircraft, receivedAt }) => ({
      ...(aircraft || {}),
      timestampMs: Date.parse(String(receivedAt || "")),
    })).filter((point) => Number.isFinite(Number(point.timestampMs))),
    [observations],
  );

  return { run, error, refresh, traceHistory };
}
