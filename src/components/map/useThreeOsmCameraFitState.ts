import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useExplorerSelection } from "@/components/explorer/ExplorerUiContext";
import {
  resolveThreeOsmFitViewport,
} from "@/features/airport/map/threeOsmCameraFit";
import {
  buildTraceFitPoints,
  resolveTraceFitCenterAnchor,
} from "@/features/airport/map/mapFitTraceModel";

export type ThreeOsmActiveCameraFit = NonNullable<
  ReturnType<typeof resolveThreeOsmFitViewport>
> & {
  reason: string;
  fitPoints: Array<[number, number]>;
  altitudeSamples: Array<Record<string, any>>;
  guardPoints: Array<[number, number]>;
};

export function useThreeOsmCameraFitState({
  rootRef,
  traces,
  fitRoutePath,
  fitAircraftId,
  fitFallbackAnchor,
  allowRouteOnlyFit,
  keepRouteInView,
  followsCenter,
  requestedTileZoom,
  tileRadius,
}: {
  rootRef: RefObject<HTMLElement | null>;
  traces: Array<Record<string, any>>;
  fitRoutePath: Array<[unknown, unknown]>;
  fitAircraftId: string;
  fitFallbackAnchor: Record<string, any> | null;
  allowRouteOnlyFit: boolean;
  keepRouteInView: boolean;
  followsCenter: boolean;
  requestedTileZoom: number;
  tileRadius: number;
}) {
  const { fitToTraceSignal } = useExplorerSelection();
  const lastFitSignalRef = useRef(0);
  const lastRouteGuardSignatureRef = useRef("");
  const fitTraces = useMemo(() => {
    const aircraftId = String(fitAircraftId || "");
    if (!aircraftId) return traces;
    return traces.filter(
      (trace) => String(trace?.aircraftHex || "") === aircraftId,
    );
  }, [fitAircraftId, traces]);
  const fitPoints = useMemo(
    () =>
      buildTraceFitPoints({
        traces: fitTraces,
        routePath: fitRoutePath,
        allowRouteOnly: allowRouteOnlyFit,
      }),
    [allowRouteOnlyFit, fitRoutePath, fitTraces],
  );
  const routeGuardPoints = useMemo(
    () =>
      buildTraceFitPoints({
        traces: [],
        routePath: fitRoutePath,
        allowRouteOnly: true,
      }),
    [fitRoutePath],
  );
  const routeGuardSignature = useMemo(
    () =>
      routeGuardPoints.length >= 2
        ? `${routeGuardPoints[0].join(":")}|${routeGuardPoints.at(-1)?.join(":")}`
        : "",
    [routeGuardPoints],
  );
  const fitAltitudeSamples = useMemo(
    () =>
      fitTraces.flatMap((trace) => {
        const points = Array.isArray(trace?.tracePoints) ? trace.tracePoints : [];
        const usable = points.filter(
          (point) =>
            Number.isFinite(Number(point?.lat)) &&
            Number.isFinite(Number(point?.lon)),
        );
        if (!usable.length) return [];
        const byAltitude = [...usable].sort(
          (a, b) => Number(a?.altitude || 0) - Number(b?.altitude || 0),
        );
        return [byAltitude[0], byAltitude.at(-1)].filter(Boolean);
      }),
    [fitTraces],
  );
  const [activeCameraFit, setActiveCameraFit] =
    useState<ThreeOsmActiveCameraFit | null>(null);
  const activateCameraFit = useCallback(
    ({
      points,
      reason,
      guardPoints = [],
    }: {
      points: Array<[number, number]>;
      reason: string;
      guardPoints?: Array<[number, number]>;
    }) => {
      const viewport = resolveThreeOsmFitViewport({
        points,
        requestedZoom: requestedTileZoom,
        tileRadius,
        aspect:
          (rootRef.current?.clientWidth || 1) /
          Math.max(1, rootRef.current?.clientHeight || 1),
      });
      if (!viewport) return false;
      setActiveCameraFit({
        ...viewport,
        reason,
        fitPoints: points,
        altitudeSamples: fitAltitudeSamples,
        guardPoints,
      });
      return true;
    },
    [fitAltitudeSamples, requestedTileZoom, rootRef, tileRadius],
  );

  useEffect(() => {
    if (fitToTraceSignal === lastFitSignalRef.current) return;
    lastFitSignalRef.current = fitToTraceSignal;
    if (fitToTraceSignal === 0) return;
    const fallback = resolveTraceFitCenterAnchor(fitFallbackAnchor);
    const points = fitPoints.length > 0 ? fitPoints : fallback ? [fallback] : [];
    if (!points.length) return;
    activateCameraFit({
      points,
      reason: allowRouteOnlyFit ? "full-route" : "recorded-points",
      guardPoints:
        keepRouteInView && routeGuardPoints.length >= 2
          ? [routeGuardPoints[0], routeGuardPoints.at(-1)!]
          : [],
    });
  }, [
    activateCameraFit,
    allowRouteOnlyFit,
    fitFallbackAnchor,
    fitPoints,
    fitToTraceSignal,
    keepRouteInView,
    routeGuardPoints,
  ]);

  useEffect(() => {
    if (!keepRouteInView || !routeGuardSignature || routeGuardPoints.length < 2) {
      lastRouteGuardSignatureRef.current = "";
      return;
    }
    if (lastRouteGuardSignatureRef.current === routeGuardSignature) return;
    lastRouteGuardSignatureRef.current = routeGuardSignature;
    activateCameraFit({
      points: fitPoints.length > 0 ? fitPoints : routeGuardPoints,
      reason: "full-route-guard",
      guardPoints: [routeGuardPoints[0], routeGuardPoints.at(-1)!],
    });
  }, [
    activateCameraFit,
    fitPoints,
    keepRouteInView,
    routeGuardPoints,
    routeGuardSignature,
  ]);

  useEffect(() => {
    if (followsCenter) setActiveCameraFit(null);
  }, [followsCenter]);

  return activeCameraFit;
}
