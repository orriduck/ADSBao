"use client";

import { createContext, useContext, useMemo } from "react";
import { useAircraftTrace } from "@/hooks/useAircraftTrace";
import { getAircraftIdentity } from "@/features/airport/context/airportContextUiModel";

// Source of truth for trace data to render on the map.
//
//   - selectedAircraft → the "primary" trace tied to the user-clicked
//     aircraft (preview card target). Used on both airport and flight
//     pages.
//   - focalAircraft → optional second trace, used on the flight detail
//     page so the URL-tracked aircraft's path is always visible even
//     when the user clicks a different plane.
//
// Exposes a `traces[]` array (1 or 2 entries, deduplicated by hex) for
// SelectedAircraftTrace to iterate over. Top-level fields mirror the
// primary trace so preview cards can render local loading state.

const EMPTY_TRACE = {
  aircraftHex: null,
  movement: null,
  tracePoints: [],
  loading: false,
  traceFetchLoading: false,
  traceStatusCode: null,
  traceError: null,
  traceUnavailable: false,
  traceCycle: 0,
  fullTrace: false,
};

const SelectedAircraftTraceContext = createContext({
  ...EMPTY_TRACE,
  traces: [],
});

function deriveTrace(aircraft, hookResult, { fullTrace = false } = {}) {
  return {
    aircraftHex: aircraft ? getAircraftIdentity(aircraft) || null : null,
    movement:
      typeof aircraft?.movement === "string" ? aircraft.movement : null,
    tracePoints: hookResult.tracePoints,
    loading: hookResult.loading,
    traceFetchLoading: hookResult.traceFetchLoading,
    traceStatusCode: hookResult.traceStatusCode ?? null,
    traceError: hookResult.traceError ?? null,
    traceUnavailable: Boolean(hookResult.traceUnavailable),
    traceCycle: hookResult.traceCycle ?? 0,
    fullTrace: Boolean(fullTrace),
  };
}

export function SelectedAircraftTraceProvider({
  selectedAircraft = null,
  focalAircraft = null,
  fullTraceForFocal = false,
  showSelectedTrace = true,
  focalTraceStartAtMs = null,
  focalPersistKey = null,
  focalTraceRefreshKey = "",
  children,
}) {
  const primaryAircraft = showSelectedTrace ? selectedAircraft : null;
  const primaryHook = useAircraftTrace(primaryAircraft);
  // Focal trace uses adsb.lol's trace_full endpoint on the aircraft
  // detail page so the user sees the whole flight on load — not just
  // the rolling tail. The optional cutoff clips the historical points
  // to (firstTrackedAt - 30 min) so we don't show days of unrelated
  // history. The persist key (callsign) keeps the merged trace in
  // localStorage so refreshes don't blank the trail. Secondary
  // (clicked) traces stick with recent + no cutoff + no persistence.
  const focalHook = useAircraftTrace(focalAircraft, {
    fullTrace: fullTraceForFocal,
    traceStartAtMs: focalTraceStartAtMs,
    persistKey: focalPersistKey,
    traceRefreshKey: focalTraceRefreshKey,
  });

  const primary = useMemo(
    () => deriveTrace(primaryAircraft, primaryHook),
    [primaryAircraft, primaryHook],
  );
  const focal = useMemo(
    () => deriveTrace(focalAircraft, focalHook, { fullTrace: fullTraceForFocal }),
    [focalAircraft, focalHook, fullTraceForFocal],
  );

  const traces = useMemo(() => {
    const out = [];
    // The URL-tracked focal renders at full opacity and is emitted
    // first so its richer trace (full + persisted) wins the dedupe.
    // If the primary refers to the same plane as the focal — the
    // default state before the user clicks anything — the bare
    // primary hook (recent-only, no persistence) would otherwise
    // shadow the focal because it shares the hex.
    if (focal.aircraftHex) {
      out.push({ ...focal, opacity: 1 });
    }
    if (
      showSelectedTrace &&
      primary.aircraftHex &&
      primary.aircraftHex !== focal.aircraftHex
    ) {
      // Primary differs from focal → user clicked a different plane.
      // Render it dimmer so the eye still privileges the page's
      // anchor flight, unless there is no focal at all (airport page).
      const dim = Boolean(focal.aircraftHex);
      out.push({ ...primary, opacity: dim ? 0.4 : 1 });
    }
    return out;
  }, [primary, focal, showSelectedTrace]);

  const value = useMemo(
    () => ({
      ...primary,
      traces,
    }),
    [primary, traces],
  );

  return (
    <SelectedAircraftTraceContext.Provider value={value}>
      {children}
    </SelectedAircraftTraceContext.Provider>
  );
}

export function useSelectedAircraftTrace() {
  return useContext(SelectedAircraftTraceContext);
}
