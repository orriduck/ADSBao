"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext.js";
import { useExplorerUi } from "@/components/explorer/ExplorerUiContext.jsx";
import { useSelectedAircraftTrace } from "@/components/aircraft/trace/SelectedAircraftTraceContext.jsx";

// Listens for the `fitToTrace` signal from the UI reducer and pans/zooms
// the map so the full trace of every currently-visible aircraft fits in
// the viewport. After fitting we push the resolved Leaflet zoom level
// back into React state so the map control's zoom-level button no longer
// reports as "active" — the next zoom click takes the user back to the
// preset cycle from a clean slate.
export default function MapFitToTraceController() {
  const map = useMapInstance();
  const { fitToTraceSignal } = useExplorerUi();
  const { traces } = useSelectedAircraftTrace();
  const lastSignalRef = useRef(0);

  useEffect(() => {
    if (!map || fitToTraceSignal === lastSignalRef.current) return;
    lastSignalRef.current = fitToTraceSignal;
    if (fitToTraceSignal === 0) return;

    const points = [];
    for (const trace of traces || []) {
      for (const point of trace.tracePoints || []) {
        const lat = Number(point?.lat);
        const lon = Number(point?.lon);
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          points.push([lat, lon]);
        }
      }
    }
    if (points.length === 0) return;

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
    // We deliberately don't sync React's mapZoom here: the auto-follow
    // is gated by mapFollowsAircraft (set to false by the fitToTrace
    // action), so even if the Leaflet zoom happens to land on a preset
    // value, the map stays anchored on the trace bounds.
  }, [fitToTraceSignal, map, traces]);

  return null;
}
