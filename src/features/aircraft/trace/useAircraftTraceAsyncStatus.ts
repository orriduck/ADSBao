"use client";

import { useEffect, useState } from "react";
import { useAsyncStatus, type AsyncStatusState } from "@/hooks/useAsyncStatus";

// Minimum time the trace-status surface stays visible after entering "loading"
// so users actually notice the "正在加载航迹…" copy even if the upstream
// request resolves in a few hundred ms.
const TRACE_STATUS_MIN_VISIBLE_MS = 4200;

interface SelectedTraceLike {
  aircraftHex?: string | null;
  traceFetchLoading?: boolean;
  traceStatusCode?: number | null;
  traceError?: unknown;
  traceUnavailable?: boolean;
  traceCycle?: number;
}

export interface AircraftTraceAsyncStatusOptions {
  aircraftIdentity: string | null;
  selectedTrace: SelectedTraceLike;
  surfaceActive: boolean;
  lingerMs?: number;
  fadeMs?: number;
}

export interface AircraftTraceAsyncStatusResult {
  visible: boolean;
  state: AsyncStatusState;
}

// Resolves the "is this aircraft's trace currently in flight?" question, holds
// the loading flag visible for at least TRACE_STATUS_MIN_VISIBLE_MS so the
// label has time to register, then hands the combined inputs to useAsyncStatus
// for the pending → success/error → fade lifecycle.
export function useAircraftTraceAsyncStatus({
  aircraftIdentity,
  selectedTrace,
  surfaceActive,
  lingerMs = 1600,
  fadeMs = 360,
}: AircraftTraceAsyncStatusOptions): AircraftTraceAsyncStatusResult {
  const traceMatchesAircraft =
    Boolean(aircraftIdentity) &&
    selectedTrace.aircraftHex === aircraftIdentity;
  const fetchLoading = traceMatchesAircraft
    ? Boolean(selectedTrace.traceFetchLoading)
    : false;
  const statusCode = traceMatchesAircraft
    ? selectedTrace.traceStatusCode ?? null
    : null;
  const error = traceMatchesAircraft ? selectedTrace.traceError ?? null : null;
  const traceUnavailable = traceMatchesAircraft
    ? Boolean(selectedTrace.traceUnavailable)
    : false;
  const cycle = traceMatchesAircraft ? selectedTrace.traceCycle ?? 0 : 0;

  const loading = useMinimumVisibleTraceLoading({
    aircraftIdentity,
    active: fetchLoading,
    surfaceActive,
  });

  const state = useAsyncStatus(
    {
      loading,
      error: traceUnavailable ? "trace-unavailable" : error,
      statusCode,
      cycleKey: `${aircraftIdentity || ""}:${cycle}`,
    },
    { lingerMs, fadeMs },
  );

  return { visible: state.phase !== "idle", state };
}

function useMinimumVisibleTraceLoading({
  aircraftIdentity,
  active,
  surfaceActive,
}: {
  aircraftIdentity: string | null;
  active: boolean;
  surfaceActive: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!aircraftIdentity || !surfaceActive) {
      setVisible(false);
      return undefined;
    }
    if (active) {
      setVisible(true);
      return undefined;
    }
    const timer = window.setTimeout(
      () => setVisible(false),
      TRACE_STATUS_MIN_VISIBLE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [aircraftIdentity, active, surfaceActive]);

  return Boolean(aircraftIdentity && surfaceActive && visible);
}
