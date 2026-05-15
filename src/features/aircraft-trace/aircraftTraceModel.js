import { getDistanceNm } from "../../utils/aircraftTrafficIntent.js";

const DEFAULT_TRACE_MAX_SAMPLES = 36;
const DEFAULT_TRACE_MAX_AGE_MS = 3 * 60 * 1000;
const DEFAULT_TRACE_MIN_DISTANCE_NM = 0.03;
const DEFAULT_TRACE_MIN_SAMPLE_GAP_MS = 1_500;
const DEFAULT_CURVE_STEPS = 8;
const DEFAULT_REMOTE_TRACE_MAX_POINTS = 240;

function isFiniteNumber(value) {
  return value !== null && value !== "" && Number.isFinite(Number(value));
}

function normalizeTracePoint(point, time = Date.now()) {
  if (!isFiniteNumber(point?.lat) || !isFiniteNumber(point?.lon)) return null;
  return {
    lat: Number(point.lat),
    lon: Number(point.lon),
    time,
  };
}

function shouldAppendTracePoint(previousPoint, nextPoint, config) {
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

function trimTraceHistory(history, nowMs, config) {
  const freshHistory = history.filter((point) => nowMs - point.time <= config.maxAgeMs);
  return freshHistory.slice(-config.maxSamples);
}

function getAircraftTraceId(aircraft = {}) {
  return aircraft.icao24 || aircraft.callsign || "";
}

function normalizeTraceTimestampMs(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 1000) : null;
}

function normalizeTraceAltitude(value) {
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
  const histories = new Map();

  return {
    update(aircraft = [], nowMs = Date.now()) {
      const activeIds = new Set();

      const nextAircraft = aircraft.map((item) => {
        const id = getAircraftTraceId(item);
        const point = normalizeTracePoint(item, nowMs);

        if (!id || !point) {
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
        return { ...item, traceHistory: trimmedHistory };
      });

      for (const id of histories.keys()) {
        if (!activeIds.has(id)) histories.delete(id);
      }

      return nextAircraft;
    },
    clear() {
      histories.clear();
    },
  };
}

function toLatLng(point) {
  return [point.lat, point.lon];
}

export function normalizeAdsbTracePayload(payload = {}) {
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
        onGround: entry[3] === "ground" || entry[6] === 1,
        velocity: isFiniteNumber(entry[4]) ? Number(entry[4]) : null,
        track: isFiniteNumber(entry[5]) ? Number(entry[5]) : null,
        baroRate: isFiniteNumber(entry[7]) ? Number(entry[7]) : null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.timestampMs - b.timestampMs);
}

function dedupeTracePointKey(point = {}) {
  return [
    point.timestampMs,
    point.lat?.toFixed?.(5) ?? point.lat,
    point.lon?.toFixed?.(5) ?? point.lon,
  ].join(":");
}

export function mergeTraceHistory({
  recentTrace = [],
  fallbackHistory = [],
} = {}) {
  const normalizedFallback = fallbackHistory
    .map((point) => {
      if (!isFiniteNumber(point?.lat) || !isFiniteNumber(point?.lon)) return null;
      const timestampMs = Number(point?.timestampMs ?? point?.time ?? 0);
      if (!Number.isFinite(timestampMs)) return null;
      return {
        timestampMs,
        lat: Number(point.lat),
        lon: Number(point.lon),
        altitude: isFiniteNumber(point?.altitude) ? Number(point.altitude) : null,
        onGround: Boolean(point?.onGround),
        velocity: isFiniteNumber(point?.velocity) ? Number(point.velocity) : null,
        track: isFiniteNumber(point?.track) ? Number(point.track) : null,
        baroRate: isFiniteNumber(point?.baroRate) ? Number(point.baroRate) : null,
      };
    })
    .filter(Boolean);

  const merged = [...recentTrace, ...normalizedFallback].sort(
    (a, b) => a.timestampMs - b.timestampMs,
  );
  const seen = new Set();
  const deduped = [];
  for (const point of merged) {
    const key = dedupeTracePointKey(point);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(point);
  }
  return deduped;
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
