"use client";

import { useEffect, useMemo, useState } from "react";
import { aircraftTraceClient } from "../features/aviation/aviationData.js";
import {
  mergeTracesByPriority,
  normalizeAdsbTracePayload,
} from "../features/aircraft/trace/aircraftTraceModel.js";
import {
  readTrackedTrace,
  writeTrackedTrace,
} from "../features/aircraft/tracking/trackedTraceStorage.js";

// How long to wait after the last merged-trace change before writing to
// localStorage. Live polls land every 3s, so a short debounce lets a
// burst of updates collapse into one write without putting the user
// more than a tick behind on the persisted set.
const PERSIST_DEBOUNCE_MS = 750;

// Session-level cache of trace points keyed by ICAO24 hex. Stores the
// `full` and `recent` source arrays separately (each with its own
// fetchedAt) so we can warm-start either source without re-paying its
// fetch and so the priority merge below stays explicit. Module scope,
// not persisted across reloads.
const traceCache = new Map();
const RECENT_TTL_MS = 90_000;
// Full traces are heavier and update less often; cache them longer so the
// user can flip away and back without re-paying the multi-MB fetch.
const FULL_TTL_MS = 10 * 60 * 1000;

function readCachedSource(hex, source) {
  const entry = traceCache.get(hex);
  if (!entry) return null;
  const slot = entry[source];
  if (!slot) return null;
  const ttl = source === "full" ? FULL_TTL_MS : RECENT_TTL_MS;
  if (Date.now() - slot.fetchedAt > ttl) return null;
  return slot.points;
}

function writeCachedSource(hex, source, points) {
  if (!hex) return;
  const entry = traceCache.get(hex) || {};
  entry[source] = { points, fetchedAt: Date.now() };
  traceCache.set(hex, entry);
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

// Drop trace points older than the cutoff. Applied after merge so every
// source path honors the clip. When the cutoff is null/non-finite the
// input is returned untouched.
function clipTracePointsBefore(points, cutoffMs) {
  const cutoff = Number(cutoffMs);
  if (!Number.isFinite(cutoff) || !Array.isArray(points)) return points;
  return points.filter((point) => Number(point?.timestampMs) >= cutoff);
}

// Resolves the displayed trace from up to four independent sources, in
// priority order: live polled position > trace_recent > trace_full >
// localStorage-persisted points (`persistKey`).
//   - trace_full is fetched only when `fullTrace` is set (aircraft
//     detail page). It provides the historical baseline.
//   - trace_recent is always fetched. It is a rolling tail of the same
//     stream and may include late corrections, so it wins over full on
//     overlap.
//   - The live point grows the trail forward in real time and is the
//     freshest source, so it wins over both. We append it as a new entry
//     on every selectedAircraft tick — the priority merge dedupes the
//     repeats by 1-second timestamp bucket.
//   - The persisted source seeds the trail instantly on reload so a
//     refresh of /aircraft/[callsign] doesn't blank the trace while the
//     fresh fetches resolve. It sits at the lowest priority because the
//     in-flight sources are by definition more authoritative.
export function useAircraftTrace(selectedAircraft = null, options = {}) {
  const hex = selectedAircraft?.icao24 || "";
  const fullTrace = Boolean(options?.fullTrace);
  // Optional lower bound on trace timestamps. The aircraft detail page
  // sets this to (firstTrackedAt - 30min) so the full trace shows the
  // current flight rather than days of historical loops.
  const traceStartAtMs = Number.isFinite(Number(options?.traceStartAtMs))
    ? Number(options.traceStartAtMs)
    : null;
  // When set (typically the focal callsign on /aircraft/[callsign]) the
  // hook reads/writes the merged trace to localStorage so refreshes
  // keep the accumulated trail.
  const persistKey =
    typeof options?.persistKey === "string" && options.persistKey.trim()
      ? options.persistKey.trim()
      : null;

  const [fullPoints, setFullPoints] = useState([]);
  const [recentPoints, setRecentPoints] = useState([]);
  const [livePoints, setLivePoints] = useState([]);
  const [persistedPoints, setPersistedPoints] = useState([]);
  const [activeHex, setActiveHex] = useState("");
  const [recentLoading, setRecentLoading] = useState(false);
  const [fullLoading, setFullLoading] = useState(false);

  // Fetch sources whenever the selected aircraft changes. Warm-start
  // each buffer from cache so flipping back to a prior aircraft doesn't
  // black out the trail mid-render.
  useEffect(() => {
    if (!hex) {
      setActiveHex("");
      setFullPoints([]);
      setRecentPoints([]);
      setLivePoints([]);
      setRecentLoading(false);
      setFullLoading(false);
      return undefined;
    }

    let disposed = false;
    setActiveHex(hex);
    setLivePoints([]);

    const cachedRecent = readCachedSource(hex, "recent");
    setRecentPoints(cachedRecent || []);
    setRecentLoading(!cachedRecent);

    aircraftTraceClient
      .fetchAircraftTrace({ hex, full: false })
      .then((payload) => {
        if (disposed) return;
        const points = normalizeAdsbTracePayload(payload?.recent);
        writeCachedSource(hex, "recent", points);
        setRecentPoints(points);
      })
      .catch((error) => {
        if (!disposed) {
          console.warn(`[aircraft-trace:${hex}] recent fetch failed`, error);
        }
      })
      .finally(() => {
        if (!disposed) setRecentLoading(false);
      });

    if (fullTrace) {
      const cachedFull = readCachedSource(hex, "full");
      setFullPoints(cachedFull || []);
      setFullLoading(!cachedFull);

      aircraftTraceClient
        .fetchAircraftTrace({ hex, full: true })
        .then((payload) => {
          if (disposed) return;
          const points = normalizeAdsbTracePayload(payload?.recent);
          writeCachedSource(hex, "full", points);
          setFullPoints(points);
        })
        .catch((error) => {
          if (!disposed) {
            console.warn(`[aircraft-trace:${hex}] full fetch failed`, error);
          }
        })
        .finally(() => {
          if (!disposed) setFullLoading(false);
        });
    } else {
      setFullPoints([]);
      setFullLoading(false);
    }

    return () => {
      disposed = true;
    };
  }, [hex, fullTrace]);

  // Append the latest polled position so the trail extends forward in
  // real time. We don't gate on loading anymore — the priority merge
  // resolves overlap correctly even if a live point lands before the
  // recent fetch resolves.
  useEffect(() => {
    if (!hex) return;
    const point = liveAircraftToTracePoint(selectedAircraft);
    if (!point) return;
    setLivePoints((current) => {
      // Cheap dedupe on the latest entry so repeated polls with the same
      // (timestamp, lat, lon) don't grow the array unboundedly. Older
      // dupes from earlier ticks are deduped by the priority merge.
      const last = current[current.length - 1];
      if (
        last &&
        last.timestampMs === point.timestampMs &&
        last.lat === point.lat &&
        last.lon === point.lon
      ) {
        return current;
      }
      return [...current, point];
    });
  }, [hex, selectedAircraft]);

  // Seed the persisted buffer when the persistKey changes so refreshes
  // pick up the prior trail immediately. The fresh full/recent fetches
  // overlay this as soon as they resolve.
  useEffect(() => {
    if (!persistKey) {
      setPersistedPoints([]);
      return;
    }
    setPersistedPoints(readTrackedTrace(persistKey));
  }, [persistKey]);

  const merged = useMemo(
    () =>
      mergeTracesByPriority({
        sources: [
          { points: livePoints, priority: 3 },
          { points: recentPoints, priority: 2 },
          { points: fullPoints, priority: 1 },
          { points: persistedPoints, priority: 0 },
        ],
      }),
    [livePoints, recentPoints, fullPoints, persistedPoints],
  );

  const tracePoints = useMemo(
    () =>
      activeHex === hex ? clipTracePointsBefore(merged, traceStartAtMs) : [],
    [activeHex, hex, merged, traceStartAtMs],
  );

  // Persist the clipped trace back to localStorage. Debounced so a burst
  // of live polls collapses into one write. We only persist what the
  // user can see — the cutoff already bounds the size, so the storage
  // cap rarely kicks in.
  useEffect(() => {
    if (!persistKey || tracePoints.length === 0) return undefined;
    const timer = window.setTimeout(() => {
      writeTrackedTrace(persistKey, tracePoints);
    }, PERSIST_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [persistKey, tracePoints]);

  return {
    tracePoints,
    loading: recentLoading || fullLoading,
  };
}
