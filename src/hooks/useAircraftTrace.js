"use client";

import { useEffect, useState } from "react";
import { aircraftTraceClient } from "../features/aviation/aviationData.js";
import {
  mergeTraceHistory,
  normalizeAdsbTracePayload,
} from "../features/aircraft/trace/aircraftTraceModel.js";

// Session-level cache of trace points keyed by ICAO24 hex + trace mode
// (recent vs full). Lets the user flip between aircraft without re-paying
// the fetch each time: warm-start from any prior render, then a background
// refresh. Module scope, not persisted across reloads.
const traceCache = new Map();
const TRACE_CACHE_TTL_MS = 90_000;
// Full traces are heavier and update less often; cache them longer so the
// user can flip away and back without re-paying the multi-MB fetch.
const TRACE_FULL_CACHE_TTL_MS = 10 * 60 * 1000;

function cacheKey(hex, fullTrace) {
  return `${fullTrace ? "full" : "recent"}:${hex}`;
}

function readTraceCache(hex, fullTrace) {
  const entry = traceCache.get(cacheKey(hex, fullTrace));
  if (!entry) return null;
  const ttl = fullTrace ? TRACE_FULL_CACHE_TTL_MS : TRACE_CACHE_TTL_MS;
  if (Date.now() - entry.fetchedAt > ttl) {
    traceCache.delete(cacheKey(hex, fullTrace));
    return null;
  }
  return entry;
}

function writeTraceCache(hex, fullTrace, tracePoints) {
  if (!hex) return;
  traceCache.set(cacheKey(hex, fullTrace), {
    tracePoints,
    fetchedAt: Date.now(),
  });
}

function liveAircraftToTracePoint(aircraft) {
  if (!aircraft) return null;
  const lat = Number(aircraft.lat);
  const lon = Number(aircraft.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const positionTime = Number(aircraft.positionTime);
  const altitude = Number(aircraft.altitude);
  const velocity = Number(aircraft.velocity);
  const track = Number(aircraft.track);
  const baroRate = Number(aircraft.baroRate);

  return {
    timestampMs: Number.isFinite(positionTime) ? positionTime : Date.now(),
    lat,
    lon,
    altitude: Number.isFinite(altitude) ? altitude : null,
    onGround: Boolean(aircraft.onGround),
    velocity: Number.isFinite(velocity) ? velocity : null,
    track: Number.isFinite(track) ? track : null,
    baroRate: Number.isFinite(baroRate) ? baroRate : null,
  };
}

export function useAircraftTrace(selectedAircraft = null, options = {}) {
  const hex = selectedAircraft?.icao24 || "";
  const fullTrace = Boolean(options?.fullTrace);
  const [traceState, setTraceState] = useState({
    hex: "",
    tracePoints: [],
  });
  const [loading, setLoading] = useState(false);

  // Fetch the recent trace once when the selection changes. Warm-start
  // from the session cache so re-selecting the same aircraft doesn't
  // black out the trail mid-render; merge into whatever live points have
  // already accumulated so we don't trample positions that polled in
  // between selection and fetch resolution.
  useEffect(() => {
    if (!hex) {
      setTraceState({ hex: "", tracePoints: [] });
      setLoading(false);
      return undefined;
    }

    let disposed = false;
    const cached = readTraceCache(hex, fullTrace);
    setTraceState({
      hex,
      tracePoints: cached?.tracePoints || [],
    });
    setLoading(!cached);

    aircraftTraceClient
      .fetchAircraftTrace({ hex, full: fullTrace })
      .then((payload) => {
        if (disposed) return;
        const recent = normalizeAdsbTracePayload(payload?.recent);
        setTraceState((current) => {
          const merged = mergeTraceHistory({
            recentTrace: recent,
            fallbackHistory: current.hex === hex ? current.tracePoints : [],
          });
          writeTraceCache(hex, fullTrace, merged);
          return { hex, tracePoints: merged };
        });
      })
      .catch((error) => {
        if (!disposed) {
          console.warn(`[aircraft-trace:${hex}] trace fetch failed`, error);
        }
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });

    return () => {
      disposed = true;
    };
  }, [hex, fullTrace]);

  // Append the latest polled position to the trace so the trail extends
  // forward in real time. Wait until the recent-trace fetch has resolved
  // before doing this — otherwise a 1-point stub from the live append
  // would render and consume the "fresh selection" animation slot in
  // SelectedAircraftTrace, so the real full trace would arrive afterward
  // with no growth animation. mergeTraceHistory dedupes by
  // (timestamp, lat, lon), so repeated polls with the same data don't
  // grow the array.
  useEffect(() => {
    if (!hex || loading) return;
    const point = liveAircraftToTracePoint(selectedAircraft);
    if (!point) return;
    setTraceState((current) => {
      if (current.hex !== hex) return current;
      const merged = mergeTraceHistory({
        recentTrace: [point],
        fallbackHistory: current.tracePoints,
      });
      writeTraceCache(hex, fullTrace, merged);
      return { hex, tracePoints: merged };
    });
  }, [hex, loading, selectedAircraft, fullTrace]);

  return {
    tracePoints: traceState.hex === hex ? traceState.tracePoints : [],
    loading,
  };
}
