import { useEffect, useMemo, useRef, useState } from "react";
import {
  getContextTilesForBounds,
} from "./aviationContextTileModel";
import {
  resolveContextTileWindowPromotion,
  resolveContextTileWindowRetryDelay,
  resolveContextTileWindowResults,
} from "./aviationContextWindowModel";
import { createRequestCache } from "@/utils/requestCache";

type ContextTileRecord = Record<string, any>;

const FRONTEND_CACHE_TTL_MS = 5 * 60 * 1000;
// Keep the restored airspace payload separate from the legacy empty-tile cache.
const AIRSPACE_CONTEXT_CACHE_VERSION = "2";
const tileRequestCache = createRequestCache<ContextTileRecord>({
  ttlMs: FRONTEND_CACHE_TTL_MS,
});

function tilePath(resource: string, tile: ContextTileRecord) {
  const path = `/api/${resource}/${tile.z}/${tile.x}/${tile.y}`;
  return resource === "airspace"
    ? `${path}?v=${AIRSPACE_CONTEXT_CACHE_VERSION}`
    : path;
}

function tileSignature(tile: ContextTileRecord) {
  return `${tile.z}/${tile.x}/${tile.y}`;
}

function uniqueBy(items = [], keyFn) {
  const seen = new Set();
  const output = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

function collectContextTileRecords(payloads: ContextTileRecord[]) {
  return {
    airspaces: uniqueBy(
      payloads.flatMap((payload) => payload.airspaces || []),
      (item) => item?.id || item?.name,
    ),
    navaids: uniqueBy(
      payloads.flatMap((payload) => payload.navaids || []),
      (item) => item?.id || `${item?.ident}:${item?.lat}:${item?.lon}`,
    ),
    navaidCounts: uniqueBy(
      payloads.flatMap((payload) => payload.navaidCounts || []),
      (item) => item?.key || `${item?.z}:${item?.x}:${item?.y}`,
    ),
    waypoints: uniqueBy(
      payloads.flatMap((payload) => payload.waypoints || []),
      (item) => item?.id || `${item?.name}:${item?.lat}:${item?.lon}`,
    ),
  };
}

async function fetchTile(url: string) {
  return tileRequestCache.request(url, () =>
    fetch(url).then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    }),
  );
}

type ContextTileResourceWindow = {
  items: ContextTileRecord[];
  loading: boolean;
  error: unknown;
  requestedSignature: string;
  visibleSignature: string;
  requestedTiles: number;
  coverageTiles: number;
  loadedTiles: number;
  failedTiles: number;
  requestCount: number;
  promotionCount: number;
  retainedFailureCount: number;
  retryAttempt: number;
  retryScheduled: boolean;
};

const EMPTY_RESOURCE_WINDOW: ContextTileResourceWindow = {
  items: [],
  loading: false,
  error: null,
  requestedSignature: "",
  visibleSignature: "",
  requestedTiles: 0,
  coverageTiles: 0,
  loadedTiles: 0,
  failedTiles: 0,
  requestCount: 0,
  promotionCount: 0,
  retainedFailureCount: 0,
  retryAttempt: 0,
  retryScheduled: false,
};

function useContextTileResourceWindow({
  tiles,
  enabled,
  resource,
  collect,
  debugPromotionDelayMs = 0,
  debugFailAfterPromotions = null,
  requestOverride = null,
  requireComplete = false,
  retryLimit = 0,
  retryDelayMs = 30_000,
}: {
  tiles: ContextTileRecord[];
  enabled: boolean;
  resource: string;
  collect: (payloads: ContextTileRecord[]) => ContextTileRecord[];
  debugPromotionDelayMs?: number;
  debugFailAfterPromotions?: number | null;
  requestOverride?: {
    signature: string;
    url: string;
    coverageTiles?: number;
  } | null;
  requireComplete?: boolean;
  retryLimit?: number;
  retryDelayMs?: number;
}) {
  const [windowState, setWindowState] = useState<ContextTileResourceWindow>(
    EMPTY_RESOURCE_WINDOW,
  );
  const promotionCountRef = useRef(0);
  const [retryState, setRetryState] = useState({
    signature: "",
    attempt: 0,
  });
  const requestOverrideEnabled = requestOverride != null;
  const requestOverrideSignature = requestOverride?.signature ?? "";
  const requestOverrideUrl = requestOverride?.url ?? "";
  const requestOverrideCoverageTiles = requestOverride?.coverageTiles ?? 0;
  const request = useMemo(() => {
    if (!enabled || (!requestOverrideEnabled && tiles.length === 0)) {
      return { signature: "", urls: [] as string[], coverageTiles: 0 };
    }
    if (requestOverrideEnabled) {
      return {
        signature: requestOverrideSignature,
        urls: [requestOverrideUrl],
        coverageTiles: Math.max(
          1,
          Math.round(Number(requestOverrideCoverageTiles) || 1),
        ),
      };
    }
    return {
      signature: tiles.map(tileSignature).join("|"),
      urls: tiles.map((tile) => tilePath(resource, tile)),
      coverageTiles: tiles.length,
    };
  }, [
    enabled,
    requestOverrideCoverageTiles,
    requestOverrideEnabled,
    requestOverrideSignature,
    requestOverrideUrl,
    resource,
    tiles,
  ]);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: number | null = null;
    if (!request.urls.length) {
      setWindowState((current) => ({
        ...current,
        items: [],
        loading: false,
        error: null,
        requestedSignature: "",
        visibleSignature: "",
        requestedTiles: 0,
        coverageTiles: 0,
        loadedTiles: 0,
        failedTiles: 0,
        retryAttempt: 0,
        retryScheduled: false,
      }));
      return undefined;
    }

    setWindowState((current) => ({
      ...current,
      loading: true,
      error: null,
      requestedSignature: request.signature,
      requestedTiles: request.urls.length,
      coverageTiles: request.coverageTiles,
      loadedTiles: 0,
      failedTiles: 0,
      requestCount: current.requestCount + 1,
      retryAttempt:
        retryState.signature === request.signature ? retryState.attempt : 0,
      retryScheduled: false,
    }));

    void Promise.allSettled(request.urls.map(fetchTile)).then(async (results) => {
      if (cancelled) return;
      if (debugPromotionDelayMs > 0) {
        await new Promise((resolve) =>
          window.setTimeout(resolve, debugPromotionDelayMs),
        );
      }
      if (cancelled) return;

      const shouldDebugFail =
        debugFailAfterPromotions != null &&
        promotionCountRef.current >= debugFailAfterPromotions &&
        results.length > 0;
      const effectiveResults = shouldDebugFail
        ? [
            {
              status: "rejected" as const,
              reason: new Error("Debug context window failure"),
            },
            ...results.slice(1),
          ]
        : results;
      const resolution = resolveContextTileWindowResults(effectiveResults, {
        requireComplete,
      });

      if (!resolution.canPromote) {
        const retryAttempt =
          retryState.signature === request.signature ? retryState.attempt : 0;
        const retryDelay = resolveContextTileWindowRetryDelay({
          attempt: retryAttempt,
          retryLimit,
          baseDelayMs: retryDelayMs,
        });
        setWindowState((current) => {
          const promotion = resolveContextTileWindowPromotion({
            currentItems: current.items,
            currentVisibleSignature: current.visibleSignature,
            requestSignature: request.signature,
            resolution,
            nextItems: [],
          });
          return {
            ...current,
            items: promotion.items,
            visibleSignature: promotion.visibleSignature,
            loading: false,
            error: resolution.error,
            requestedSignature: request.signature,
            requestedTiles: request.urls.length,
            coverageTiles: request.coverageTiles,
            loadedTiles: resolution.loaded,
            failedTiles: resolution.failed,
            retainedFailureCount: current.retainedFailureCount + 1,
            retryAttempt,
            retryScheduled: retryDelay != null,
          };
        });
        if (retryDelay != null) {
          retryTimer = window.setTimeout(() => {
            if (cancelled) return;
            setRetryState({
              signature: request.signature,
              attempt: retryAttempt + 1,
            });
          }, retryDelay);
        }
        return;
      }

      promotionCountRef.current += 1;
      const items = collect(resolution.payloads);
      setWindowState((current) => {
        const promotion = resolveContextTileWindowPromotion({
          currentItems: current.items,
          currentVisibleSignature: current.visibleSignature,
          requestSignature: request.signature,
          resolution,
          nextItems: items,
        });
        return {
          ...current,
          items: promotion.items,
          visibleSignature: promotion.visibleSignature,
          loading: false,
          error: null,
          requestedSignature: request.signature,
          requestedTiles: request.urls.length,
          coverageTiles: request.coverageTiles,
          loadedTiles: resolution.loaded,
          failedTiles: 0,
          promotionCount: current.promotionCount + 1,
          retryAttempt:
            retryState.signature === request.signature ? retryState.attempt : 0,
          retryScheduled: false,
        };
      });
    });

    return () => {
      cancelled = true;
      if (retryTimer != null) window.clearTimeout(retryTimer);
    };
  }, [
    collect,
    debugFailAfterPromotions,
    debugPromotionDelayMs,
    request.signature,
    request.urls,
    request.coverageTiles,
    requireComplete,
    retryDelayMs,
    retryLimit,
    retryState.attempt,
    retryState.signature,
  ]);

  return windowState;
}

const collectAirspaces = (payloads: ContextTileRecord[]) =>
  collectContextTileRecords(payloads).airspaces;
const collectNavaids = (payloads: ContextTileRecord[]) =>
  collectContextTileRecords(payloads).navaids;
const collectNavaidCounts = (payloads: ContextTileRecord[]) =>
  collectContextTileRecords(payloads).navaidCounts;
const collectWaypoints = (payloads: ContextTileRecord[]) =>
  collectContextTileRecords(payloads).waypoints;

export function useAviationContextTiles({
  map = null,
  bounds = null,
  zoom = null,
  enabled = false,
  airspacesEnabled = false,
  navaidsEnabled = false,
  navaidCountsEnabled = false,
  waypointsEnabled = false,
  refreshKey = "",
  debugAirspacePromotionDelayMs = 0,
  debugAirspaceFailAfterPromotions = null,
  airspaceRequest = null,
}: ContextTileRecord = {}) {
  const [tiles, setTiles] = useState([]);
  const lastTileSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if ((!map && !bounds) || !enabled) {
      setTiles([]);
      lastTileSignatureRef.current = null;
      return undefined;
    }

    const updateTiles = () => {
      let nextTiles = [];
      try {
        nextTiles = getContextTilesForBounds({
          bounds: map?.getBounds?.() || bounds,
          zoom: map?.getZoom?.() ?? zoom,
        });
      } catch {
        return;
      }
      const signature = nextTiles.map(tileSignature).join("|");
      if (signature === lastTileSignatureRef.current) return;
      lastTileSignatureRef.current = signature;
      setTiles(nextTiles);
    };

    const frame = window.requestAnimationFrame(updateTiles);
    if (!map) {
      return () => window.cancelAnimationFrame(frame);
    }
    // The first animation frame can run before Leaflet has committed its
    // initial bounds. Re-run once its view is actually ready so a stationary
    // first load still requests its viewport context (including airspace).
    map.whenReady?.(updateTiles);
    const readyRetry = window.setTimeout(updateTiles, 350);
    map.on?.("load", updateTiles);
    map.on?.("moveend", updateTiles);
    map.on?.("zoomend", updateTiles);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(readyRetry);
      map.off?.("load", updateTiles);
      map.off?.("moveend", updateTiles);
      map.off?.("zoomend", updateTiles);
    };
  }, [bounds, enabled, map, refreshKey, zoom]);

  const airspaceWindow = useContextTileResourceWindow({
    tiles,
    enabled: enabled && airspacesEnabled,
    resource: "airspace",
    collect: collectAirspaces,
    debugPromotionDelayMs: debugAirspacePromotionDelayMs,
    debugFailAfterPromotions: debugAirspaceFailAfterPromotions,
    requestOverride: airspaceRequest,
    requireComplete: Boolean(airspaceRequest),
    retryLimit: airspaceRequest ? 2 : 0,
  });
  const navaidWindow = useContextTileResourceWindow({
    tiles,
    enabled: enabled && navaidsEnabled,
    resource: "navaids",
    collect: collectNavaids,
  });
  const navaidCountWindow = useContextTileResourceWindow({
    tiles,
    enabled: enabled && navaidCountsEnabled,
    resource: "navaid-counts",
    collect: collectNavaidCounts,
  });
  const waypointWindow = useContextTileResourceWindow({
    tiles,
    enabled: enabled && waypointsEnabled,
    resource: "waypoints",
    collect: collectWaypoints,
  });
  const resourceWindows = [
    airspaceWindow,
    navaidWindow,
    navaidCountWindow,
    waypointWindow,
  ];

  return {
    airspaces: airspaceWindow.items,
    navaids: navaidWindow.items,
    navaidCounts: navaidCountWindow.items,
    waypoints: waypointWindow.items,
    loading: resourceWindows.some((window) => window.loading),
    error: resourceWindows.find((window) => window.error)?.error ?? null,
    airspaceWindow,
  };
}
