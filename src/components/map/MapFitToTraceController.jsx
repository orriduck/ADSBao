"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext.js";
import { useExplorerUi } from "@/components/explorer/ExplorerUiContext.jsx";
import { useSelectedAircraftTrace } from "@/components/aircraft/trace/SelectedAircraftTraceContext.jsx";
import { buildTraceFitPoints } from "@/features/airport/map/mapFitTraceModel.js";

// Listens for the `fitToTrace` signal from the UI reducer and pans/zooms
// the map so the full trace of every currently-visible aircraft fits in
// the viewport.
//
// When the optional `routePath` prop is supplied, it is folded into the
// bounds. The flight page passes this only for FlightAware-sourced focal
// routes; otherwise fitting stays scoped to the visible focal/secondary
// trace union and does not zoom out to static adsbdb endpoints.
//
// After fitting we don't sync React's mapZoom: auto-follow is gated by
// mapFollowsAircraft (the fitToTrace action already turns that off),
// so even when the resolved Leaflet zoom lands on a preset value the
// map stays anchored on the bounds we just computed.
export default function MapFitToTraceController({ routePath = [], disabled = false }) {
  const map = useMapInstance();
  const { fitToTraceSignal } = useExplorerUi();
  const { traces } = useSelectedAircraftTrace();
  const lastSignalRef = useRef(0);

  useEffect(() => {
    if (!map || fitToTraceSignal === lastSignalRef.current) return;
    lastSignalRef.current = fitToTraceSignal;
    if (fitToTraceSignal === 0 || disabled) return;

    const points = buildTraceFitPoints({ traces, routePath });

    if (points.length === 0) return;

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
  }, [disabled, fitToTraceSignal, map, traces, routePath]);

  return null;
}
