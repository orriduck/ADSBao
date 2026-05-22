"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext.js";
import { useExplorerUi } from "@/components/explorer/ExplorerUiContext.jsx";
import { useSelectedAircraftTrace } from "@/components/aircraft/trace/SelectedAircraftTraceContext.jsx";

function pushFiniteLatLon(points, lat, lon) {
  const latNum = Number(lat);
  const lonNum = Number(lon);
  if (Number.isFinite(latNum) && Number.isFinite(lonNum)) {
    points.push([latNum, lonNum]);
  }
}

// Listens for the `fitToTrace` signal from the UI reducer and pans/zooms
// the map so the full trace of every currently-visible aircraft fits in
// the viewport.
//
// When the optional `routeEndpoints` prop is supplied (typed loosely as
// { origin?: { lat, lon }, destination?: { lat, lon } } — the shape the
// flight-route normalizer emits), origin and destination coords are
// folded into the bounds. With a tracked flight that has known
// endpoints, this zooms out to fit `origin → trace → destination` so
// the entire planned route is visible — matching the user-facing
// expectation that "fit" means the whole flight, not just the
// observed ADS-B tail.
//
// After fitting we don't sync React's mapZoom: auto-follow is gated by
// mapFollowsAircraft (the fitToTrace action already turns that off),
// so even when the resolved Leaflet zoom lands on a preset value the
// map stays anchored on the bounds we just computed.
export default function MapFitToTraceController({ routeEndpoints = null }) {
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
        pushFiniteLatLon(points, point?.lat, point?.lon);
      }
    }

    // Fold the route's known endpoints into the bounds when present.
    // Either one (or both) might be missing — e.g. a private GA flight
    // with no resolved route — and that's fine; we just keep the trace
    // bounds.
    if (routeEndpoints) {
      pushFiniteLatLon(
        points,
        routeEndpoints.origin?.lat,
        routeEndpoints.origin?.lon,
      );
      pushFiniteLatLon(
        points,
        routeEndpoints.destination?.lat,
        routeEndpoints.destination?.lon,
      );
    }

    if (points.length === 0) return;

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
  }, [fitToTraceSignal, map, traces, routeEndpoints]);

  return null;
}
