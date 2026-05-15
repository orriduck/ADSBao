"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { aircraftTraceClient } from "../services/aviationData.js";
import {
  mergeTraceHistory,
  normalizeAdsbTracePayload,
} from "../features/aircraft-trace/aircraftTraceModel.js";

export function useAircraftTrace(selectedAircraft = null) {
  const hex = selectedAircraft?.icao24 || "";
  const fallbackTrace = useMemo(
    () =>
      mergeTraceHistory({
        fallbackHistory: (selectedAircraft?.traceHistory || []).map((point) => ({
          ...point,
          timestampMs: point?.timestampMs ?? point?.time ?? null,
        })),
      }),
    [selectedAircraft],
  );
  const [tracePoints, setTracePoints] = useState(fallbackTrace);
  const [loading, setLoading] = useState(false);
  const fallbackTraceRef = useRef(fallbackTrace);

  useEffect(() => {
    fallbackTraceRef.current = fallbackTrace;
  }, [fallbackTrace]);

  useEffect(() => {
    if (!hex) {
      setTracePoints(fallbackTrace);
      return;
    }

    setTracePoints((current) =>
      current.length > fallbackTrace.length ? current : fallbackTrace,
    );
  }, [fallbackTrace, hex]);

  useEffect(() => {
    if (!hex) {
      setTracePoints(fallbackTraceRef.current);
      setLoading(false);
      return;
    }

    let disposed = false;
    setTracePoints(fallbackTraceRef.current);
    setLoading(true);

    aircraftTraceClient
      .fetchAircraftTrace({ hex })
      .then((payload) => {
        if (disposed) return;

        setTracePoints(
          mergeTraceHistory({
            fullTrace: normalizeAdsbTracePayload(payload?.full),
            recentTrace: normalizeAdsbTracePayload(payload?.recent),
            fallbackHistory: fallbackTraceRef.current,
          }),
        );
      })
      .catch((error) => {
        if (!disposed) {
          console.warn(`[aircraft-trace:${hex}] trace fetch failed`, error);
          setTracePoints(fallbackTraceRef.current);
        }
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });

    return () => {
      disposed = true;
    };
  }, [hex]);

  return {
    tracePoints,
    loading,
  };
}
