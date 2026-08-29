import { useEffect, useMemo, useRef, useState } from "react";
import {
  getContextTilesForBounds,
} from "./aviationContextTileModel";
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
}: ContextTileRecord = {}) {
  const [tiles, setTiles] = useState([]);
  const [airspaces, setAirspaces] = useState([]);
  const [navaids, setNavaids] = useState([]);
  const [navaidCounts, setNavaidCounts] = useState([]);
  const [waypoints, setWaypoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
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

  const requestUrls = useMemo(() => {
    if (!enabled || tiles.length === 0) return [];
    return tiles.flatMap((tile) => {
      const urls = [];
      if (airspacesEnabled) urls.push(tilePath("airspace", tile));
      if (navaidsEnabled) urls.push(tilePath("navaids", tile));
      if (navaidCountsEnabled) urls.push(tilePath("navaid-counts", tile));
      if (waypointsEnabled) urls.push(tilePath("waypoints", tile));
      return urls;
    });
  }, [
    airspacesEnabled,
    enabled,
    navaidCountsEnabled,
    navaidsEnabled,
    tiles,
    waypointsEnabled,
  ]);

  useEffect(() => {
    let cancelled = false;
    if (requestUrls.length === 0) {
      setAirspaces([]);
      setNavaids([]);
      setNavaidCounts([]);
      setWaypoints([]);
      setLoading(false);
      setError(null);
      return undefined;
    }

    setLoading(true);
    setError(null);

    void Promise.allSettled(requestUrls.map(fetchTile))
      .then((results) => {
        if (cancelled) return;
        const payloads = results.flatMap((result) =>
          result.status === "fulfilled" ? [result.value] : [],
        );
        const rejected = results.find(
          (result) => result.status === "rejected",
        );
        if (rejected) setError(rejected.reason);
        if (payloads.length === 0 && rejected) throw rejected.reason;
        const next = collectContextTileRecords(payloads);
        setAirspaces(next.airspaces);
        setNavaids(next.navaids);
        setNavaidCounts(next.navaidCounts);
        setWaypoints(next.waypoints);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [requestUrls]);

  return {
    airspaces,
    navaids,
    navaidCounts,
    waypoints,
    loading,
    error,
  };
}
