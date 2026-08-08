import { useCallback, useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext";
import { useExplorerSelection } from "@/components/explorer/ExplorerUiContext";
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
// bounds. `allowRouteOnly` lets Full trace frame origin → destination even
// before the first recorded sample; All recorded points leaves routePath empty.
//
// After fitting we don't sync React's mapZoom: auto-follow is gated by
// mapFollowsAircraft (the fitToTrace action already turns that off),
// so even when the resolved Leaflet zoom lands on a preset value the
// map stays anchored on the bounds we just computed.
export default function MapFitToTraceController({
  routePath = [],
  fitTraceAircraftId = "",
  allowRouteOnly = false,
  keepRouteInView = false,
  fallbackAnchor = null,
  centerAnchor = null,
  centerAnchorFollowKey = "",
  autoFitKey = "",
  fitOptions = DEFAULT_FIT_OPTIONS,
  onAutoFit,
}: Record<string, any>) {
  const map = useMapInstance();
  const { fitToTraceSignal } = useExplorerSelection();
  const { traces } = useSelectedAircraftTrace();
  const lastSignalRef = useRef(0);
  const lastAutoFitKeyRef = useRef("");
  const lastCenterAnchorFollowKeyRef = useRef("");
  const fitTraces = useMemo(() => {
    const aircraftId = String(fitTraceAircraftId || "");
    if (!aircraftId) return traces;
    return traces.filter(
      (trace) => String(trace?.aircraftHex || "") === aircraftId,
    );
  }, [fitTraceAircraftId, traces]);
  const fitPoints = useMemo(
    () => buildTraceFitPoints({ traces: fitTraces, routePath, allowRouteOnly }),
    [allowRouteOnly, fitTraces, routePath],
  );
  const routeFitPoints = useMemo(
    () =>
      buildTraceFitPoints({
        traces: [],
        routePath,
        allowRouteOnly: true,
      }),
    [routePath],
  );
  const fitCenterAnchor = useMemo(
    () => resolveTraceFitCenterAnchor(centerAnchor),
    [centerAnchor],
  );
  const fitFallbackAnchor = useMemo(
    () => resolveTraceFitCenterAnchor(fallbackAnchor),
    [fallbackAnchor],
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
    (points, reason = "trace") => {
      if (!map || points.length === 0) return;
      const bounds = L.latLngBounds(points);
      const resolvedFitOptions = withFloatingSidebarFitPadding(
        map,
        fitOptions || DEFAULT_FIT_OPTIONS,
      );
      const debugFitCount =
        import.meta.env.DEV && typeof window !== "undefined"
          ? Number((window as any).__adsbaoTraceViewDebug?.fitCount || 0) + 1
          : 0;
      const publishDebugState = () => {
        if (!import.meta.env.DEV || typeof window === "undefined") return;
        (window as any).__adsbaoTraceViewMap = map;
        (window as any).__adsbaoTraceViewDebug = {
          reason,
          fitCount: debugFitCount,
          pointCount: points.length,
          requestedBounds: bounds.toBBoxString(),
          visibleBounds: map.getBounds?.().toBBoxString?.() || "",
          zoom: map.getZoom?.(),
          updatedAt: new Date().toISOString(),
        };
      };
      map.fitBounds(bounds, { ...resolvedFitOptions, animate: false });
      publishDebugState();
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

    fitMapToPoints(
      fitPoints.length > 0
        ? fitPoints
        : fitFallbackAnchor
          ? [fitFallbackAnchor]
          : [],
      allowRouteOnly ? "full-route" : "recorded-points",
    );
  }, [
    allowRouteOnly,
    fitFallbackAnchor,
    fitMapToPoints,
    fitToTraceSignal,
    fitPoints,
    map,
  ]);

  useEffect(() => {
    if (!keepRouteInView || !map || routeFitPoints.length < 2) {
      return undefined;
    }

    const endpoints = [routeFitPoints[0], routeFitPoints.at(-1)].filter(
      Boolean,
    );
    let restoring = false;
    let frameId: number | null = null;

    const endpointsVisible = () => {
      const bounds = map.getBounds?.();
      return Boolean(
        bounds &&
          endpoints.every((point) =>
            bounds.contains(L.latLng(point[0], point[1])),
          ),
      );
    };
    const fitRoute = () => {
      restoring = true;
      fitMapToPoints(routeFitPoints, "full-route-guard");
      if (frameId != null) window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        restoring = false;
        frameId = null;
      });
    };
    const ensureRouteVisible = () => {
      if (!restoring && !endpointsVisible()) fitRoute();
    };

    fitRoute();
    map.on("moveend", ensureRouteVisible);
    map.on("resize", ensureRouteVisible);
    return () => {
      if (frameId != null) window.cancelAnimationFrame(frameId);
      map.off("moveend", ensureRouteVisible);
      map.off("resize", ensureRouteVisible);
    };
  }, [fitMapToPoints, keepRouteInView, map, routeFitPoints]);

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
