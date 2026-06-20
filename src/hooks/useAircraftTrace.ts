import { useEffect, useMemo, useRef, useState } from "react";
import { createAircraftTraceClient } from "../features/aircraft/trace/aircraftTraceClient";
import {
  composeAircraftTrace,
  isAircraftTraceUnavailable,
  normalizeAdsbTracePayload,
} from "../features/aircraft/trace/aircraftTraceModel";
import {
  resolveAircraftTraceRefreshSources,
} from "../features/aircraft/trace/aircraftTraceRefreshModel";
import {
  readTrackedTrace,
  writeTrackedTrace,
} from "../features/aircraft/tracking/trackedTraceStorage";
import {
  readErrorStatus,
  readResponseStatus,
} from "../features/aviation/httpClient";
import {
  beginAircraftMotionState,
  calculateAircraftVisualPosition,
  shouldAnimateAircraftVisualPosition,
} from "../utils/aircraftMotion";

// How long to wait after the last merged-trace change before writing to
// localStorage. Live polls land every 3s, so a short debounce lets a
// burst of updates collapse into one write without putting the user
// more than a tick behind on the persisted set.
const PERSIST_DEBOUNCE_MS = 750;
const TRACE_VISUAL_TICK_MS = 1_000;
const LIVE_TRACE_MAX_POINTS = 120;
const TRACE_LIVE_BUCKET_MS = 60_000;
const aircraftTraceClient = createAircraftTraceClient();

type AircraftTraceHookRecord = Record<string, any>;

function formatTraceFetchLabel(selectedAircraft: AircraftTraceHookRecord | null, hex: string) {
  return selectedAircraft?.callsign || selectedAircraft?.registration || hex;
}

function formatTracePointTime(point: AircraftTraceHookRecord | null | undefined) {
  const timestampMs = Number(point?.timestampMs);
  return Number.isFinite(timestampMs) ? new Date(timestampMs).toISOString() : null;
}

function fetchTraceSource({ hex, label, source, full }: AircraftTraceHookRecord) {
  return aircraftTraceClient
    .fetchAircraftTrace({ hex, full })
    .then((payload) => {
      const points = normalizeAdsbTracePayload(payload?.recent);
      console.info("[aircraft-trace:fetch]", {
        label,
        hex,
        source,
        provider: payload?.source || null,
        count: points.length,
        first: formatTracePointTime(points[0]),
        last: formatTracePointTime(points.at(-1)),
      });
      return { payload, points };
    });
}

function liveTraceBucket(timestampMs: number) {
  return Math.floor(timestampMs / TRACE_LIVE_BUCKET_MS);
}

function appendLiveTracePoint(current: AircraftTraceHookRecord[], point: AircraftTraceHookRecord) {
  const last = current[current.length - 1];
  if (
    last &&
    last.timestampMs === point.timestampMs &&
    last.lat === point.lat &&
    last.lon === point.lon
  ) {
    return current;
  }
  if (
    last &&
    Number.isFinite(Number(last.timestampMs)) &&
    Number.isFinite(Number(point.timestampMs)) &&
    liveTraceBucket(Number(last.timestampMs)) === liveTraceBucket(Number(point.timestampMs))
  ) {
    return [...current.slice(0, -1), point];
  }
  return [...current, point].slice(-LIVE_TRACE_MAX_POINTS);
}

function resolveLatLonPosition(position: AircraftTraceHookRecord | null | undefined) {
  const lat = Number(position?.lat);
  const lon = Number(position?.lon);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

function liveAircraftToTracePoint(
  aircraft: AircraftTraceHookRecord | null,
  {
    position = null,
    timestampMs = null,
    inferred = false,
  }: AircraftTraceHookRecord = {},
) {
  if (!aircraft) return null;
  const resolvedPosition = resolveLatLonPosition(position) || resolveLatLonPosition(aircraft);
  if (!resolvedPosition) return null;

  const positionTime = Number(aircraft.positionTime);
  const traceTimestampMs = Number(timestampMs);
  const altitude = Number(aircraft.altitude);
  const velocity = Number(aircraft.velocity);
  const track = Number(aircraft.track);
  const baroRate = Number(aircraft.baroRate);

  return {
    timestampMs: Number.isFinite(traceTimestampMs)
      ? traceTimestampMs
      : Number.isFinite(positionTime)
        ? positionTime
        : Date.now(),
    lat: resolvedPosition.lat,
    lon: resolvedPosition.lon,
    altitude: Number.isFinite(altitude) ? altitude : null,
    onGround: Boolean(aircraft.onGround),
    velocity: Number.isFinite(velocity) ? velocity : null,
    track: Number.isFinite(track) ? track : null,
    baroRate: Number.isFinite(baroRate) ? baroRate : null,
    ...(inferred ? { inferred: true } : null),
  };
}

function localTraceHistoryToTracePoints(aircraft: AircraftTraceHookRecord | null) {
  const traceHistory = Array.isArray(aircraft?.traceHistory)
    ? aircraft.traceHistory
    : [];
  return traceHistory
    .map((point) => {
      const timestampMs = Number(point?.timestampMs ?? point?.time);
      const lat = Number(point?.lat);
      const lon = Number(point?.lon);
      if (
        !Number.isFinite(timestampMs) ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lon)
      ) {
        return null;
      }
      return {
        timestampMs,
        lat,
        lon,
        altitude: null,
        onGround: false,
        velocity: null,
        track: null,
        baroRate: null,
      };
    })
    .filter(Boolean);
}

// Resolves the displayed trace from independent sources through
// `composeAircraftTrace`: selected airport traces directly stitch
// recent+live; focus-flight traces directly stitch clipped full,
// recent, live, and persisted points.
//
// Priority order inside a valid stitch is: live polled position >
// trace_recent > trace_full > localStorage-persisted points (`persistKey`).
//   - trace_full is fetched only when `fullTrace` is set (aircraft
//     detail page). It provides the historical baseline.
//   - trace_recent is always fetched. It is a rolling tail of the same
//     stream and may include late corrections, so it wins over full on
//     overlap.
//   - The live point grows the trail forward in real time and is the
//     freshest source, so it wins over both. We append it as a new entry
//     on every selectedAircraft tick — the priority merge keeps only the
//     latest point for each minute.
//   - The persisted source seeds the trail instantly on reload so a
//     refresh of /aircraft/[callsign] doesn't blank the trace while the
//     fresh fetches resolve. It sits at the lowest priority because the
//     in-flight sources are by definition more authoritative.
export function useAircraftTrace(
  selectedAircraft: AircraftTraceHookRecord | null = null,
  options: AircraftTraceHookRecord = {},
) {
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
  const traceRefreshKey =
    typeof options?.traceRefreshKey === "string"
      ? options.traceRefreshKey
      : "";
  const traceLabel = formatTraceFetchLabel(selectedAircraft, hex);

  const [fullPoints, setFullPoints] = useState([]);
  const [recentPoints, setRecentPoints] = useState([]);
  const [livePoints, setLivePoints] = useState([]);
  const [persistedPoints, setPersistedPoints] = useState([]);
  const [activeHex, setActiveHex] = useState("");
  const [recentLoading, setRecentLoading] = useState(false);
  const [fullLoading, setFullLoading] = useState(false);
  const [traceStatusCode, setTraceStatusCode] = useState<number | null>(null);
  const [traceError, setTraceError] = useState<unknown>(null);
  const [recentTraceUnavailable, setRecentTraceUnavailable] = useState(false);
  const cycleRef = useRef(0);
  const traceMotionRef = useRef<AircraftTraceHookRecord | null>(null);
  const latestVisualTracePointRef = useRef<AircraftTraceHookRecord | null>(null);
  const [traceCycle, setTraceCycle] = useState(0);
  const localTracePoints = useMemo(
    () => localTraceHistoryToTracePoints(selectedAircraft),
    [selectedAircraft],
  );

  // Fetch sources whenever the selected aircraft changes. Trace sources
  // are deliberately not cached in this hook: every selection pays a
  // fresh recent/full request so the UI reflects the latest upstream
  // trace files.
  useEffect(() => {
    if (!hex) {
      setActiveHex("");
      setFullPoints([]);
      setRecentPoints([]);
      setLivePoints([]);
      traceMotionRef.current = null;
      latestVisualTracePointRef.current = null;
      setRecentLoading(false);
      setFullLoading(false);
      setRecentTraceUnavailable(false);
      return undefined;
    }

    let disposed = false;
    const label = traceLabel;
    setActiveHex(hex);
    setLivePoints([]);
    traceMotionRef.current = null;
    latestVisualTracePointRef.current = null;
    setRecentPoints([]);
    setRecentLoading(true);
    setTraceError(null);
    setTraceStatusCode(null);
    setRecentTraceUnavailable(false);
    cycleRef.current += 1;
    setTraceCycle(cycleRef.current);

    fetchTraceSource({
      hex,
      label,
      source: "recent",
      full: false,
    })
      .then(({ payload, points }) => {
        if (disposed) return;
        setRecentPoints(points);
        setRecentTraceUnavailable(
          Boolean(payload?.traceUnavailable) || points.length < 2,
        );
        setTraceStatusCode(readResponseStatus(payload) ?? 200);
      })
      .catch((error) => {
        if (!disposed) {
          console.warn(`[aircraft-trace:${hex}] recent fetch failed`, error);
          setTraceError(error);
          setTraceStatusCode(readErrorStatus(error));
        }
      })
      .finally(() => {
        if (!disposed) setRecentLoading(false);
      });

    if (fullTrace) {
      setFullPoints([]);
      setFullLoading(true);

      fetchTraceSource({
        hex,
        label,
        source: "full",
        full: true,
      })
        .then(({ payload, points }) => {
          if (disposed) return;
          setFullPoints(points);
          setTraceStatusCode((prev) => prev ?? readResponseStatus(payload) ?? 200);
        })
        .catch((error) => {
          if (!disposed) {
            console.warn(`[aircraft-trace:${hex}] full fetch failed`, error);
            setTraceError((prev) => prev ?? error);
            setTraceStatusCode((prev) => prev ?? readErrorStatus(error));
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
  }, [hex, fullTrace, traceLabel]);

  // While the tracked-flight page is resuming from a background tab (or
  // keeping the lost-signal overlay alive), silently refresh the upstream
  // trace sources so browser sleep does not leave a gap in the active path.
  useEffect(() => {
    const sources = resolveAircraftTraceRefreshSources({
      refreshKey: traceRefreshKey,
      fullTrace,
    });
    if (!hex || sources.length === 0) return undefined;

    let disposed = false;
    const label = traceLabel;
    if (sources.some((source) => source.full)) setFullLoading(true);
    if (sources.some((source) => !source.full)) setRecentLoading(true);

    sources.forEach(({ source, full }) => {
      fetchTraceSource({
        hex,
        label,
        source,
        full,
      })
        .then(({ points }) => {
          if (disposed) return;
          if (full) {
            setFullPoints(points);
          } else {
            setRecentPoints(points);
          }
        })
        .catch((error) => {
          if (!disposed) {
            console.warn(
              `[aircraft-trace:${hex}] background ${source} fetch failed`,
              error,
            );
          }
        })
        .finally(() => {
          if (disposed) return;
          if (full) {
            setFullLoading(false);
          } else {
            setRecentLoading(false);
          }
        });
    });

    return () => {
      disposed = true;
    };
  }, [hex, traceRefreshKey, fullTrace, traceLabel]);

  // Append the latest polled position so the trail extends forward in
  // real time. Use the same visual motion model as aircraft markers so
  // the trace head follows inferred movement without rebuilding on every
  // animation frame.
  useEffect(() => {
    if (!hex) return;
    const now = Date.now();
    const currentVisual = latestVisualTracePointRef.current
      ? {
          lat: latestVisualTracePointRef.current.lat,
          lon: latestVisualTracePointRef.current.lon,
        }
      : null;
    traceMotionRef.current = beginAircraftMotionState(
      selectedAircraft,
      now,
      currentVisual,
    );
    const point = liveAircraftToTracePoint(selectedAircraft, {
      position: calculateAircraftVisualPosition(traceMotionRef.current, now),
      timestampMs: now,
      inferred: true,
    });
    if (!point) return;
    latestVisualTracePointRef.current = point;
    setLivePoints((current) => {
      return appendLiveTracePoint(current, point);
    });
  }, [hex, selectedAircraft]);

  useEffect(() => {
    if (!hex || typeof window === "undefined") return undefined;

    const tick = () => {
      const motion = traceMotionRef.current;
      const now = Date.now();
      if (!motion || !shouldAnimateAircraftVisualPosition(motion, now)) return;
      const point = liveAircraftToTracePoint(selectedAircraft, {
        position: calculateAircraftVisualPosition(motion, now),
        timestampMs: now,
        inferred: true,
      });
      if (!point) return;
      latestVisualTracePointRef.current = point;
      setLivePoints((current) => appendLiveTracePoint(current, point));
    };

    tick();
    const timer = window.setInterval(tick, TRACE_VISUAL_TICK_MS);
    return () => window.clearInterval(timer);
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

  const composedTrace = useMemo(() => {
    if (activeHex !== hex) {
      return { points: [], loading: false };
    }
    return composeAircraftTrace({
      mode: fullTrace ? "focus" : "selected",
      sources: {
        live: livePoints,
        recent: recentPoints,
        local: localTracePoints,
        full: fullPoints,
        persisted: persistedPoints,
      },
      recentLoading,
      fullLoading,
      fullCutoffMs: traceStartAtMs,
    });
  }, [
    activeHex,
    hex,
    fullTrace,
    livePoints,
    recentPoints,
    localTracePoints,
    fullPoints,
    persistedPoints,
    recentLoading,
    fullLoading,
    traceStartAtMs,
  ]);
  const tracePoints = composedTrace.points;
  const persistedTracePoints = useMemo(
    () => tracePoints.filter((point) => !point?.inferred),
    [tracePoints],
  );
  const traceUnavailable = isAircraftTraceUnavailable({
    recentTraceUnavailable,
    loading: composedTrace.loading,
    tracePointCount: tracePoints.length,
  });

  // Persist the clipped trace back to localStorage. Debounced so a burst
  // of live polls collapses into one write. Inferred visual-head points
  // stay display-only; the persisted trace remains actual provider/local
  // samples.
  useEffect(() => {
    if (!persistKey || persistedTracePoints.length === 0) return undefined;
    const timer = window.setTimeout(() => {
      writeTrackedTrace(persistKey, persistedTracePoints);
    }, PERSIST_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [persistKey, persistedTracePoints]);

  // Memoize the returned object so its identity is stable when the fields
  // are unchanged — the SelectedAircraftTrace context keys a memo on this
  // whole object, so a fresh literal every render would churn it (and all
  // its consumers) on every poll-driven re-render.
  return useMemo(
    () => ({
      tracePoints,
      loading: composedTrace.loading,
      traceFetchLoading: Boolean(recentLoading || fullLoading),
      traceStatusCode,
      traceError,
      traceUnavailable,
      traceCycle,
    }),
    [
      tracePoints,
      composedTrace.loading,
      recentLoading,
      fullLoading,
      traceStatusCode,
      traceError,
      traceUnavailable,
      traceCycle,
    ],
  );
}
