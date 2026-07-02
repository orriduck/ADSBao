import { getDistanceNm } from "../../../utils/aircraftTrafficIntent";
import { resolveTraceLegCutoffMs } from "./traceLegModel";

const DEFAULT_TRACE_MAX_SAMPLES = 36;
const DEFAULT_TRACE_MAX_AGE_MS = 3 * 60 * 1000;
const DEFAULT_TRACE_MIN_DISTANCE_NM = 0.03;
const DEFAULT_TRACE_MIN_SAMPLE_GAP_MS = 1_500;
const DEFAULT_CURVE_STEPS = 8;
const DEFAULT_REMOTE_TRACE_MAX_POINTS = 240;
const DEFAULT_SOLID_TRACE_MAX_GAP_MS = 90 * 1000;
const DEFAULT_TRACE_CONNECTOR_MAX_GAP_MS = 10 * 60 * 1000;
const TRACE_MAX_GROUND_SPEED_KNOTS = 1500;
const TRACE_MINUTE_BUCKET_MS = 60 * 1000;
const TRACE_LIVE_BUCKET_MS = 15 * 1000;

type TraceRecord = Record<string, any>;

type AircraftTraceUnavailableOptions = {
  recentTraceUnavailable?: unknown;
  loading?: unknown;
  tracePointCount?: unknown;
};

function isFiniteNumber(value: unknown) {
  return value !== null && value !== "" && Number.isFinite(Number(value));
}

function normalizeTracePoint(point: TraceRecord | null | undefined, time = Date.now()) {
  if (!isFiniteNumber(point?.lat) || !isFiniteNumber(point?.lon)) return null;
  return {
    lat: Number(point.lat),
    lon: Number(point.lon),
    time,
  };
}

function shouldAppendTracePoint(
  previousPoint: TraceRecord | null,
  nextPoint: TraceRecord,
  config: TraceRecord,
) {
  if (!previousPoint) return true;

  const timeGapMs = Math.abs((nextPoint?.time ?? 0) - (previousPoint?.time ?? 0));
  const distanceNm = getDistanceNm(
    previousPoint.lat,
    previousPoint.lon,
    nextPoint.lat,
    nextPoint.lon,
  );

  return (
    timeGapMs >= config.minSampleGapMs &&
    distanceNm != null &&
    distanceNm >= config.minDistanceNm
  );
}

function trimTraceHistory(history: TraceRecord[], nowMs: number, config: TraceRecord) {
  const freshHistory = history.filter((point) => nowMs - point.time <= config.maxAgeMs);
  // Preserve the input reference when nothing was trimmed — lets the
  // per-id structural sharing below skip rebuilding the emitted object
  // for aircraft whose trace didn't change this tick.
  if (
    freshHistory.length === history.length &&
    history.length <= config.maxSamples
  ) {
    return history;
  }
  return freshHistory.slice(-config.maxSamples);
}

// True when the previously-emitted object still matches the incoming item
// (same own fields) and the same trace-history array — so it can be reused
// by reference instead of spreading a fresh object every poll.
function emittedMatchesItem(
  emitted: TraceRecord | undefined,
  item: TraceRecord,
  trimmedHistory: TraceRecord[],
) {
  if (!emitted || emitted.traceHistory !== trimmedHistory) return false;
  const itemKeys = Object.keys(item);
  // emitted = { ...item, traceHistory } → exactly one extra key.
  if (Object.keys(emitted).length !== itemKeys.length + 1) return false;
  for (const key of itemKeys) {
    if (item[key] !== emitted[key]) return false;
  }
  return true;
}

function getAircraftTraceId(aircraft: TraceRecord = {}) {
  return aircraft.icao24 || aircraft.callsign || "";
}

function normalizeTraceTimestampMs(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 1000) : null;
}

function normalizeTraceAltitude(value: unknown) {
  if (value === "ground") return 0;
  return isFiniteNumber(value) ? Number(value) : null;
}

export function createAircraftTraceTracker(options = {}) {
  const config = {
    maxSamples: DEFAULT_TRACE_MAX_SAMPLES,
    maxAgeMs: DEFAULT_TRACE_MAX_AGE_MS,
    minDistanceNm: DEFAULT_TRACE_MIN_DISTANCE_NM,
    minSampleGapMs: DEFAULT_TRACE_MIN_SAMPLE_GAP_MS,
    ...options,
  };
  const histories = new Map<string, TraceRecord[]>();
  // Per-id cache of the last emitted object so unchanged aircraft keep a
  // stable reference across polls (enables React.memo to bail), plus the
  // last returned array so a fully-unchanged tick returns the same array
  // reference (lets the poller skip setState entirely).
  const lastEmitted = new Map<string, TraceRecord>();
  let lastResult: TraceRecord[] = [];

  return {
    update(aircraft = [], nowMs = Date.now()) {
      const activeIds = new Set();
      let changedFromLast = aircraft.length !== lastResult.length;

      const nextAircraft = aircraft.map((item, index) => {
        const id = getAircraftTraceId(item);
        const point = normalizeTracePoint(item, nowMs);

        if (!id || !point) {
          // No id to cache under → a fresh object every tick, always a change.
          changedFromLast = true;
          return { ...item, traceHistory: [] };
        }

        activeIds.add(id);
        const previousHistory = trimTraceHistory(histories.get(id) || [], nowMs, config);
        const lastPoint = previousHistory.at(-1) || null;
        const nextHistory = shouldAppendTracePoint(lastPoint, point, config)
          ? [...previousHistory, point]
          : previousHistory;
        const trimmedHistory = trimTraceHistory(nextHistory, nowMs, config);
        histories.set(id, trimmedHistory);

        const prevEmitted = lastEmitted.get(id);
        const emitted = emittedMatchesItem(prevEmitted, item, trimmedHistory)
          ? (prevEmitted as TraceRecord)
          : { ...item, traceHistory: trimmedHistory };
        lastEmitted.set(id, emitted);
        if (lastResult[index] !== emitted) changedFromLast = true;
        return emitted;
      });

      for (const id of histories.keys()) {
        if (!activeIds.has(id)) {
          histories.delete(id);
          lastEmitted.delete(id);
        }
      }

      // Nothing changed (same length, every slot reference-identical) →
      // return the previous array so consumers can skip re-rendering.
      if (!changedFromLast) return lastResult;
      lastResult = nextAircraft;
      return nextAircraft;
    },
    clear() {
      histories.clear();
      lastEmitted.clear();
      lastResult = [];
    },
  };
}

function toLatLng(point: TraceRecord) {
  return [point.lat, point.lon];
}

export function normalizeAdsbTracePayload(payload: TraceRecord = {}) {
  const baseTimestampMs = normalizeTraceTimestampMs(payload?.timestamp);
  if (baseTimestampMs == null || !Array.isArray(payload?.trace)) return [];

  return payload.trace
    .map((entry) => {
      if (!Array.isArray(entry)) return null;
      const offsetSeconds = Number(entry[0]);
      const lat = Number(entry[1]);
      const lon = Number(entry[2]);
      if (!Number.isFinite(offsetSeconds) || !Number.isFinite(lat) || !Number.isFinite(lon)) {
        return null;
      }

      return {
        timestampMs: baseTimestampMs + Math.round(offsetSeconds * 1000),
        lat,
        lon,
        altitude: normalizeTraceAltitude(entry[3]),
        // entry[6] is the readsb flags BITFIELD (1=stale position, 2=new
        // leg, ...), not a ground indicator — the altitude field is the
        // only ground signal in trace files. Treating flags===1 as
        // onGround used to mark the last pre-gap sample of oceanic legs
        // as grounded, which broke leg-boundary detection.
        onGround: entry[3] === "ground",
        velocity: isFiniteNumber(entry[4]) ? Number(entry[4]) : null,
        track: isFiniteNumber(entry[5]) ? Number(entry[5]) : null,
        baroRate: isFiniteNumber(entry[7]) ? Number(entry[7]) : null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.timestampMs - b.timestampMs);
}

function dedupeTracePointKey(point: TraceRecord = {}) {
  return [
    point.timestampMs,
    point.lat?.toFixed?.(5) ?? point.lat,
    point.lon?.toFixed?.(5) ?? point.lon,
  ].join(":");
}

function traceMinuteBucket(timestampMs: number) {
  return Math.floor(timestampMs / TRACE_MINUTE_BUCKET_MS);
}

function traceBucket(timestampMs: number, bucketMs: number) {
  return Math.floor(timestampMs / bucketMs);
}

// Union a re-fetched rolling source with what we already had. adsb.lol's
// trace_recent is a sliding window: a refresh 10 minutes into a flight no
// longer contains the takeoff. Replacing the buffer with the fresh window
// would silently drop that history (and right after UTC midnight the full
// day-file can still be YESTERDAY's, so nothing else covers it). Keep the
// points that rolled out of the fresh window, take the fresh window for
// the overlap (it may carry corrections), and cap the buffer.
const RECENT_TRACE_UNION_MAX_POINTS = 5_000;

export function mergeRecentTracePoints(
  previous: TraceRecord[] = [],
  fresh: TraceRecord[] = [],
) {
  const freshPoints = Array.isArray(fresh) ? fresh : [];
  const previousPoints = Array.isArray(previous) ? previous : [];
  if (freshPoints.length === 0) return previousPoints;
  if (previousPoints.length === 0) return freshPoints;
  const freshStartMs = Number(freshPoints[0]?.timestampMs);
  if (!Number.isFinite(freshStartMs)) return previousPoints;
  const kept = previousPoints.filter(
    (point) => Number(point?.timestampMs) < freshStartMs,
  );
  return [...kept, ...freshPoints].slice(-RECENT_TRACE_UNION_MAX_POINTS);
}

export function dedupeTracePointsByMinuteLatest(points = []) {
  const buckets = new Map();
  if (!Array.isArray(points)) return [];

  for (const point of points) {
    const timestampMs = Number(point?.timestampMs ?? point?.time);
    if (
      !isFiniteNumber(point?.lat) ||
      !isFiniteNumber(point?.lon) ||
      !Number.isFinite(timestampMs)
    ) {
      continue;
    }
    const normalizedPoint = {
      ...point,
      timestampMs,
      lat: Number(point.lat),
      lon: Number(point.lon),
    };
    const bucket = traceMinuteBucket(timestampMs);
    const existing = buckets.get(bucket);
    if (!existing || existing.timestampMs <= timestampMs) {
      buckets.set(bucket, normalizedPoint);
    }
  }

  return Array.from(buckets.values()).sort(
    (a, b) => a.timestampMs - b.timestampMs,
  );
}

// Resolve overlapping trace points across multiple sources. Live samples keep
// a finer bucket so turning traces do not rewrite the same minute's control
// point, while historical sources still collapse to the latest point per
// minute. If two sources publish the same timestamp in a bucket, the explicit
// `priority` field breaks the tie (higher wins).
//
// Used by the aircraft detail page where three sources overlap:
//   priority 3 — live polled position (freshest, includes telemetry)
//   priority 2 — trace_recent (rolling tail, can include corrections)
//   priority 1 — trace_full (historical baseline)
function mergeTracesByPriority({ sources = [] } = {}) {
  const buckets = new Map();
  const liveMinuteBuckets = new Set();
  for (const source of sources) {
    if (!source) continue;
    const priority = Number(source.priority) || 0;
    const bucketMs =
      Number.isFinite(Number(source.bucketMs)) && Number(source.bucketMs) > 0
        ? Number(source.bucketMs)
        : TRACE_MINUTE_BUCKET_MS;
    const suppressesMinuteBucket = Boolean(source.suppressesMinuteBucket);
    const points = Array.isArray(source.points) ? source.points : [];
    for (const point of points) {
      if (!isFiniteNumber(point?.lat) || !isFiniteNumber(point?.lon)) continue;
      const timestampMs = Number(point?.timestampMs ?? point?.time);
      if (!Number.isFinite(timestampMs)) continue;
      const minuteBucket = traceMinuteBucket(timestampMs);
      if (!suppressesMinuteBucket && liveMinuteBuckets.has(minuteBucket)) {
        continue;
      }
      if (suppressesMinuteBucket) liveMinuteBuckets.add(minuteBucket);
      const bucket = `${bucketMs}:${traceBucket(timestampMs, bucketMs)}`;
      const existing = buckets.get(bucket);
      if (
        existing &&
        (existing.timestampMs > timestampMs ||
          (existing.timestampMs === timestampMs && existing.priority >= priority))
      ) {
        continue;
      }
      buckets.set(bucket, {
        priority,
        timestampMs,
        point: {
          timestampMs,
          lat: Number(point.lat),
          lon: Number(point.lon),
          altitude: isFiniteNumber(point?.altitude) ? Number(point.altitude) : null,
          onGround: Boolean(point?.onGround),
          velocity: isFiniteNumber(point?.velocity) ? Number(point.velocity) : null,
          track: isFiniteNumber(point?.track) ? Number(point.track) : null,
          baroRate: isFiniteNumber(point?.baroRate) ? Number(point.baroRate) : null,
          ...(point?.inferred ? { inferred: true } : null),
        },
      });
    }
  }
  return Array.from(buckets.values())
    .map((entry) => entry.point)
    .sort((a, b) => a.timestampMs - b.timestampMs);
}

function getTraceGroundSpeedKnots(
  previousPoint: TraceRecord,
  nextPoint: TraceRecord,
  gapMs: number,
) {
  const distanceNm = getDistanceNm(
    previousPoint.lat,
    previousPoint.lon,
    nextPoint.lat,
    nextPoint.lon,
  );
  if (!Number.isFinite(distanceNm) || !Number.isFinite(gapMs) || gapMs <= 0) {
    return null;
  }
  return (distanceNm / gapMs) * 3_600_000;
}

export function segmentTracePoints(
  points = [],
  {
    solidMaxGapMs = DEFAULT_SOLID_TRACE_MAX_GAP_MS,
    connectorMaxGapMs = DEFAULT_TRACE_CONNECTOR_MAX_GAP_MS,
    maxGroundSpeedKnots = TRACE_MAX_GROUND_SPEED_KNOTS,
  } = {},
) {
  const normalized = Array.isArray(points)
    ? points.filter(
        (point) =>
          isFiniteNumber(point?.lat) &&
          isFiniteNumber(point?.lon) &&
          Number.isFinite(Number(point?.timestampMs ?? point?.time)),
      )
    : [];
  if (normalized.length === 0) return { segments: [], connectors: [] };

  const segments = [];
  const connectors = [];
  let currentSegment = [normalized[0]];

  for (let index = 1; index < normalized.length; index += 1) {
    const previous = normalized[index - 1];
    const point = normalized[index];
    const gapMs =
      Number(point?.timestampMs ?? point?.time) -
      Number(previous?.timestampMs ?? previous?.time);
    const groundSpeedKnots = getTraceGroundSpeedKnots(previous, point, gapMs);
    const plausibleSpeed =
      groundSpeedKnots == null || groundSpeedKnots <= maxGroundSpeedKnots;

    if (Number.isFinite(gapMs) && gapMs > 0 && gapMs <= solidMaxGapMs && plausibleSpeed) {
      currentSegment.push(point);
      continue;
    }

    segments.push({ points: currentSegment });

    if (
      Number.isFinite(gapMs) &&
      gapMs > solidMaxGapMs &&
      gapMs <= connectorMaxGapMs &&
      plausibleSpeed
    ) {
      connectors.push({
        confidence: "low",
        gapMs,
        points: [previous, point],
      });
    }

    currentSegment = [point];
  }

  segments.push({ points: currentSegment });
  return { segments, connectors };
}

export function composeAircraftTrace({
  mode = "selected",
  sources = {},
  recentLoading = false,
  fullLoading = false,
  clipToLeg = false,
}: {
  mode?: string;
  sources?: TraceRecord;
  recentLoading?: boolean;
  fullLoading?: boolean;
  clipToLeg?: boolean;
} = {}) {
  const isFocusMode = mode === "focus";
  const livePoints = Array.isArray(sources.live) ? sources.live : [];
  const visualHeadPoints = Array.isArray(sources.visualHead)
    ? sources.visualHead
    : [];
  const recentRaw = Array.isArray(sources.recent) ? sources.recent : [];
  const fullRaw =
    isFocusMode && Array.isArray(sources.full) ? sources.full : [];
  const persistedRaw =
    isFocusMode && Array.isArray(sources.persisted) ? sources.persisted : [];
  // Historical sources can span several flights: the adsb.lol full trace
  // covers the whole UTC day and the persisted trail survives 24h. Clip
  // every non-live source to the current leg so earlier legs (or
  // yesterday's same-callsign flight) never bleed into the focus trace.
  const legCutoffMs =
    isFocusMode && clipToLeg
      ? resolveTraceLegCutoffMs([...fullRaw, ...persistedRaw, ...recentRaw])
      : null;
  const fullPoints = clipTracePointsBefore(fullRaw, legCutoffMs);
  const persistedPoints = clipTracePointsBefore(persistedRaw, legCutoffMs);
  const recentPoints = isFocusMode
    ? clipTracePointsBefore(recentRaw, legCutoffMs)
    : recentRaw;
  // The visual head is the dead-reckoned marker position. It rides along
  // as display-only leading edge (bucketMs 1 → never collides with real
  // samples) and must not suppress real data, so it stays separate from
  // the authoritative live-fix source.
  const visualHeadSource = {
    name: "visual-head",
    points: visualHeadPoints,
    priority: 4,
    bucketMs: 1,
  };
  const liveSource = {
    name: "live",
    points: livePoints,
    priority: 3,
    bucketMs: TRACE_LIVE_BUCKET_MS,
    suppressesMinuteBucket: true,
  };
  const modeSources = isFocusMode
    ? [
        visualHeadSource,
        liveSource,
        { name: "recent", points: recentPoints, priority: 2 },
        { name: "full", points: fullPoints, priority: 1 },
        { name: "persisted", points: persistedPoints, priority: 0 },
      ]
    : [
        visualHeadSource,
        liveSource,
        { name: "recent", points: recentPoints, priority: 2 },
        { name: "local", points: sources.local, priority: 1 },
      ];
  const merged = mergeTracesByPriority({
    sources: modeSources,
  });
  return {
    points: merged,
    loading: recentLoading && merged.length === 0,
    fullLoading: isFocusMode ? Boolean(fullLoading) : false,
    recentLoading: Boolean(recentLoading),
  };
}

export function isAircraftTraceUnavailable({
  recentTraceUnavailable = false,
  loading = false,
  tracePointCount = 0,
}: AircraftTraceUnavailableOptions = {}) {
  const pointCount = Number(tracePointCount);
  return Boolean(
    recentTraceUnavailable &&
      !loading &&
      (!Number.isFinite(pointCount) || pointCount < 2),
  );
}

// Drop trace points older than the cutoff. Applied per source before
// merge so the focus-flight historical sources honor the current-leg
// lower bound; selected airport traces stay recent+live only.
function clipTracePointsBefore(points, cutoffMs) {
  const cutoff = Number(cutoffMs);
  if (!Number.isFinite(cutoff) || !Array.isArray(points)) return points || [];
  return points.filter((point) => Number(point?.timestampMs) >= cutoff);
}

export function downsampleTracePoints(
  points = [],
  maxPoints = DEFAULT_REMOTE_TRACE_MAX_POINTS,
) {
  if (points.length <= maxPoints) return points;
  if (maxPoints <= 2) return [points[0], points.at(-1)].filter(Boolean);

  const sampled = [points[0]];
  const step = (points.length - 1) / (maxPoints - 1);
  for (let index = 1; index < maxPoints - 1; index++) {
    sampled.push(points[Math.round(index * step)]);
  }
  sampled.push(points.at(-1));

  return sampled.filter(
    (point, index, array) =>
      index === 0 ||
      dedupeTracePointKey(point) !== dedupeTracePointKey(array[index - 1]),
  );
}

function interpolateCatmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;

  const lat =
    0.5 *
    ((2 * p1.lat) +
      (-p0.lat + p2.lat) * t +
      (2 * p0.lat - 5 * p1.lat + 4 * p2.lat - p3.lat) * t2 +
      (-p0.lat + 3 * p1.lat - 3 * p2.lat + p3.lat) * t3);
  const lon =
    0.5 *
    ((2 * p1.lon) +
      (-p0.lon + p2.lon) * t +
      (2 * p0.lon - 5 * p1.lon + 4 * p2.lon - p3.lon) * t2 +
      (-p0.lon + 3 * p1.lon - 3 * p2.lon + p3.lon) * t3);

  return [lat, lon];
}

export function buildAircraftTraceCurve(points = [], curveSteps = DEFAULT_CURVE_STEPS) {
  const normalized = points.filter(
    (point) => isFiniteNumber(point?.lat) && isFiniteNumber(point?.lon),
  );

  if (normalized.length <= 1) return normalized.map(toLatLng);
  if (normalized.length === 2) return normalized.map(toLatLng);

  const curve = [toLatLng(normalized[0])];
  for (let index = 0; index < normalized.length - 1; index++) {
    const p0 = normalized[index - 1] || normalized[index];
    const p1 = normalized[index];
    const p2 = normalized[index + 1];
    const p3 = normalized[index + 2] || p2;

    for (let step = 1; step <= curveSteps; step++) {
      const t = step / curveSteps;
      curve.push(interpolateCatmullRom(p0, p1, p2, p3, t));
    }
  }

  curve[curve.length - 1] = toLatLng(normalized.at(-1));
  return curve;
}
