"use client";

import { createContext, useContext, useMemo } from "react";
import { useAircraftTrace } from "@/hooks/useAircraftTrace.js";
import { getAircraftIdentity } from "@/features/airport/context/airportContextUiModel.js";

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
// primary trace so existing consumers (TraceLoadingToast) keep working
// without changes.

const EMPTY_TRACE = {
  aircraftHex: null,
  movement: null,
  tracePoints: [],
  loading: false,
};

const SelectedAircraftTraceContext = createContext({
  ...EMPTY_TRACE,
  traces: [],
});

function deriveTrace(aircraft, hookResult) {
  return {
    aircraftHex: aircraft ? getAircraftIdentity(aircraft) || null : null,
    movement:
      typeof aircraft?.movement === "string" ? aircraft.movement : null,
    tracePoints: hookResult.tracePoints,
    loading: hookResult.loading,
  };
}

export function SelectedAircraftTraceProvider({
  selectedAircraft = null,
  focalAircraft = null,
  fullTraceForFocal = false,
  children,
}) {
  const primaryHook = useAircraftTrace(selectedAircraft);
  // Focal trace uses adsb.lol's trace_full endpoint on the aircraft
  // detail page so the user sees the whole flight on load — not just
  // the rolling tail. Secondary (clicked) traces stick with recent.
  const focalHook = useAircraftTrace(focalAircraft, {
    fullTrace: fullTraceForFocal,
  });

  const primary = useMemo(
    () => deriveTrace(selectedAircraft, primaryHook),
    [selectedAircraft, primaryHook],
  );
  const focal = useMemo(
    () => deriveTrace(focalAircraft, focalHook),
    [focalAircraft, focalHook],
  );

  const traces = useMemo(() => {
    const out = [];
    const seen = new Set();
    // The URL-tracked focal renders at full opacity. A "secondary" trace
    // — the aircraft the user clicked when it's NOT the focal — renders
    // at 40% so the eye still privileges the page's anchor flight.
    const focalKey = focal.aircraftHex;
    if (primary.aircraftHex) {
      const isPrimaryFocal =
        !focalKey || primary.aircraftHex === focalKey;
      out.push({ ...primary, opacity: isPrimaryFocal ? 1 : 0.4 });
      seen.add(primary.aircraftHex);
    }
    if (focal.aircraftHex && !seen.has(focal.aircraftHex)) {
      out.push({ ...focal, opacity: 1 });
    }
    return out;
  }, [primary, focal]);

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
