"use client";

import { createContext, useContext, useMemo } from "react";
import { useAircraftTrace } from "../../hooks/useAircraftTrace.js";
import { getAircraftIdentity } from "../airport-context/airportContextUiModel.js";

// Single source of truth for the currently-focused aircraft's trace.
// Provider runs the fetch + live-append machinery once, near the top of
// the explorer tree, and consumers (currently only SelectedAircraftTrace)
// read aircraftHex / tracePoints / loading from this context instead of
// drilling them through props.

const SelectedAircraftTraceContext = createContext({
  aircraftHex: null,
  movement: null,
  tracePoints: [],
  loading: false,
});

export function SelectedAircraftTraceProvider({
  selectedAircraft = null,
  children,
}) {
  const aircraftHex = selectedAircraft
    ? getAircraftIdentity(selectedAircraft) || null
    : null;
  const movement =
    typeof selectedAircraft?.movement === "string"
      ? selectedAircraft.movement
      : null;
  const { tracePoints, loading } = useAircraftTrace(selectedAircraft);

  const value = useMemo(
    () => ({ aircraftHex, movement, tracePoints, loading }),
    [aircraftHex, movement, tracePoints, loading],
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
