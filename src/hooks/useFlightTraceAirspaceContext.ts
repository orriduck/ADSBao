"use client";

import { useEffect, useMemo, useState } from "react";

type TraceContextRecord = Record<string, any>;

const EMPTY_CONTEXT = {
  source: "supabase",
  tracePointCount: 0,
  firstTimestampMs: null,
  lastTimestampMs: null,
  airspaceIds: [],
  regions: [],
  airspaces: [],
  loading: false,
  error: null,
};

const normalizePoint = (point: TraceContextRecord | null | undefined) => {
  const lat = Number(point?.lat);
  const lon = Number(point?.lon);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return null;
  }
  const timestampMs = Number(point?.timestampMs);
  return {
    lat,
    lon,
    timestampMs: Number.isFinite(timestampMs) ? timestampMs : null,
  };
};

export function useFlightTraceAirspaceContext({
  enabled = false,
  tracePoints = [],
}: TraceContextRecord = {}) {
  const normalizedTracePoints = useMemo(
    () =>
      Array.isArray(tracePoints)
        ? tracePoints.slice(-500).map(normalizePoint).filter(Boolean)
        : [],
    [tracePoints],
  );
  const traceSignature = useMemo(
    () => JSON.stringify(normalizedTracePoints),
    [normalizedTracePoints],
  );
  const [context, setContext] = useState(EMPTY_CONTEXT);

  useEffect(() => {
    if (!enabled || normalizedTracePoints.length === 0) {
      setContext(EMPTY_CONTEXT);
      return undefined;
    }

    const controller = new AbortController();
    setContext((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    fetch("/api/flight-trace/airspace-context", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tracePoints: normalizedTracePoints }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || `HTTP ${response.status}`);
        }
        return payload;
      })
      .then((payload) => {
        setContext({
          source: payload?.source || "supabase",
          tracePointCount: Number(payload?.tracePointCount) || 0,
          firstTimestampMs: payload?.firstTimestampMs ?? null,
          lastTimestampMs: payload?.lastTimestampMs ?? null,
          airspaceIds: Array.isArray(payload?.airspaceIds) ? payload.airspaceIds : [],
          regions: Array.isArray(payload?.regions) ? payload.regions : [],
          airspaces: Array.isArray(payload?.airspaces) ? payload.airspaces : [],
          loading: false,
          error: null,
        });
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        setContext((current) => ({
          ...current,
          loading: false,
          error,
        }));
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, traceSignature]);

  return context;
}
