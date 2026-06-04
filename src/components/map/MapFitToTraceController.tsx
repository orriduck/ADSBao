"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext";
import { useExplorerUi } from "@/components/explorer/ExplorerUiContext";
import { useSelectedAircraftTrace } from "@/components/aircraft/trace/SelectedAircraftTraceContext";
import {
  buildTraceFitPoints,
  resolveTraceFitCenterAnchor,
} from "@/features/airport/map/mapFitTraceModel";
import {
  getOffsetMapCenter,
  withFloatingSidebarFitPadding,
} from "./mapViewportOffset";

const DEFAULT_FIT_OPTIONS = Object.freeze({
  padding: Object.freeze([60, 60]),
  maxZoom: 14,
});

// Listens for the `fitToTrace` signal from the UI reducer and pans/zooms
// the map so the full trace of every currently-visible aircraft fits in
// the viewport. When `autoFitKey` is provided, it waits until trace
// points exist and then performs the same fit once for that key.
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
export default function MapFitToTraceController({
  routePath = [],
  centerAnchor = null,
  centerAnchorFollowKey = "",
  autoFitKey = "",
  fitOptions = DEFAULT_FIT_OPTIONS,
  onAutoFit,
}: Record<string, any>) {
  const map = useMapInstance();
  const { fitToTraceSignal } = useExplorerUi();
  const { traces } = useSelectedAircraftTrace();
  const lastSignalRef = useRef(0);
  const lastAutoFitKeyRef = useRef("");
  const lastCenterAnchorFollowKeyRef = useRef("");
  const fitPoints = useMemo(
    () => buildTraceFitPoints({ traces, routePath }),
    [traces, routePath],
  );
  const fitCenterAnchor = useMemo(
    () => resolveTraceFitCenterAnchor(centerAnchor),
    [centerAnchor],
  );
  const panMapToAnchor = useCallback(
    (anchor, { animate = true } = {}) => {
      if (!map || !anchor) return;
      const zoom = map.getZoom?.();
      const targetCenter = getOffsetMapCenter(
        map,
        { lat: anchor[0], lon: anchor[1] },
        zoom,
      );
      map.panTo(targetCenter, {
        animate,
        duration: animate ? 0.35 : 0,
        easeLinearity: 0.22,
      });
    },
    [map],
  );
  const fitMapToPoints = useCallback(
    (points) => {
      if (!map || points.length === 0) return;
      const bounds = L.latLngBounds(points);
      map.fitBounds(
        bounds,
        withFloatingSidebarFitPadding(map, fitOptions || DEFAULT_FIT_OPTIONS),
      );
      if (fitCenterAnchor) {
        window.requestAnimationFrame(() => panMapToAnchor(fitCenterAnchor));
      }
    },
    [fitCenterAnchor, fitOptions, map, panMapToAnchor],
  );

  useEffect(() => {
    if (!map || fitToTraceSignal === lastSignalRef.current) return;
    lastSignalRef.current = fitToTraceSignal;
    if (fitToTraceSignal === 0) return;

    fitMapToPoints(fitPoints);
  }, [fitMapToPoints, fitToTraceSignal, fitPoints, map]);

  useEffect(() => {
    const key = String(autoFitKey || "").trim();
    if (!key) {
      lastAutoFitKeyRef.current = "";
      return;
    }
    if (!map || key === lastAutoFitKeyRef.current || fitPoints.length === 0) {
      return;
    }
    lastAutoFitKeyRef.current = key;
    fitMapToPoints(fitPoints);
    onAutoFit?.();
  }, [autoFitKey, fitMapToPoints, fitPoints, map, onAutoFit]);

  useEffect(() => {
    const key = String(centerAnchorFollowKey || "").trim();
    if (!key) {
      lastCenterAnchorFollowKeyRef.current = "";
      return;
    }
    if (key === lastCenterAnchorFollowKeyRef.current) return;
    if (!map || !fitCenterAnchor) return;
    lastCenterAnchorFollowKeyRef.current = key;
    panMapToAnchor(fitCenterAnchor);
  }, [centerAnchorFollowKey, fitCenterAnchor, map, panMapToAnchor]);

  return null;
}
