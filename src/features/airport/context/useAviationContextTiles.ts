"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getContextTilesForBounds,
} from "./aviationContextTileModel";

type ContextTileRecord = Record<string, any>;

const FRONTEND_CACHE_TTL_MS = 5 * 60 * 1000;
const memoryCache = new Map<string, { expiresAt: number; payload: ContextTileRecord }>();
const inFlight = new Map<string, Promise<ContextTileRecord>>();

function tilePath(resource: string, tile: ContextTileRecord) {
  return `/api/${resource}/${tile.z}/${tile.x}/${tile.y}`;
}

function tilePathWithQuery(resource: string, tile: ContextTileRecord, query: ContextTileRecord = {}) {
  const path = tilePath(resource, tile);
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value == null || value === "") return;
    params.set(key, String(value));
  });
  const suffix = params.toString();
  return suffix ? `${path}?${suffix}` : path;
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

async function fetchTile(url: string) {
  const now = Date.now();
  const cached = memoryCache.get(url);
  if (cached && cached.expiresAt > now) return cached.payload;

  const pending = inFlight.get(url);
  if (pending) return pending;

  const promise = fetch(url)
    .then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      memoryCache.set(url, {
        expiresAt: Date.now() + FRONTEND_CACHE_TTL_MS,
        payload,
      });
      return payload;
    })
    .finally(() => {
      inFlight.delete(url);
    });
  inFlight.set(url, promise);
  return promise;
}

export function useAviationContextTiles({
  map = null,
  enabled = false,
  airspacesEnabled = false,
  navaidsEnabled = false,
  navaidCountsEnabled = false,
  waypointsEnabled = false,
  airspaceAltitudeFtMsl = null,
  refreshKey = "",
}: ContextTileRecord = {}) {
  const [tiles, setTiles] = useState([]);
  const [airspaces, setAirspaces] = useState([]);
  const [navaids, setNavaids] = useState([]);
  const [navaidCounts, setNavaidCounts] = useState([]);
  const [waypoints, setWaypoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const lastTileSignatureRef = useRef("");

  useEffect(() => {
    if (!map || !enabled) {
      setTiles([]);
      lastTileSignatureRef.current = "";
      return undefined;
    }

    const updateTiles = () => {
      const nextTiles = getContextTilesForBounds({
        bounds: map.getBounds?.(),
        zoom: map.getZoom?.(),
      });
      const signature = nextTiles.map(tileSignature).join("|");
      if (signature === lastTileSignatureRef.current) return;
      lastTileSignatureRef.current = signature;
      setTiles(nextTiles);
    };

    updateTiles();
    map.on?.("moveend", updateTiles);
    map.on?.("zoomend", updateTiles);
    return () => {
      map.off?.("moveend", updateTiles);
      map.off?.("zoomend", updateTiles);
    };
  }, [enabled, map, refreshKey]);

  const requestUrls = useMemo(() => {
    if (!enabled || tiles.length === 0) return [];
    return tiles.flatMap((tile) => {
      const urls = [];
      if (airspacesEnabled) {
        urls.push(
          tilePathWithQuery("airspace", tile, {
            altitudeFt: airspaceAltitudeFtMsl,
          }),
        );
      }
      if (navaidsEnabled) urls.push(tilePath("navaids", tile));
      if (navaidCountsEnabled) urls.push(tilePath("navaid-counts", tile));
      if (waypointsEnabled) urls.push(tilePath("waypoints", tile));
      return urls;
    });
  }, [
    airspacesEnabled,
    airspaceAltitudeFtMsl,
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
    Promise.allSettled(requestUrls.map(fetchTile)).then((results) => {
      if (cancelled) return;
      const payloads = results
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value);
      setAirspaces(
        uniqueBy(
          payloads.flatMap((payload) => payload.airspaces || []),
          (item) => item?.id || item?.name,
        ),
      );
      setNavaids(
        uniqueBy(
          payloads.flatMap((payload) => payload.navaids || []),
          (item) => item?.id || `${item?.ident}:${item?.lat}:${item?.lon}`,
        ),
      );
      setNavaidCounts(
        uniqueBy(
          payloads.flatMap((payload) => payload.navaidCounts || []),
          (item) => item?.key || `${item?.z}:${item?.x}:${item?.y}`,
        ),
      );
      setWaypoints(
        uniqueBy(
          payloads.flatMap((payload) => payload.waypoints || []),
          (item) => item?.id || `${item?.name}:${item?.lat}:${item?.lon}`,
        ),
      );
      const rejected = results.find((result) => result.status === "rejected");
      setError(rejected?.reason || null);
      setLoading(false);
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
