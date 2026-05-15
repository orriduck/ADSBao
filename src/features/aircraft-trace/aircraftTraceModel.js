import { getDistanceNm } from "../../utils/aircraftTrafficIntent.js";

const DEFAULT_TRACE_MAX_SAMPLES = 36;
const DEFAULT_TRACE_MAX_AGE_MS = 3 * 60 * 1000;
const DEFAULT_TRACE_MIN_DISTANCE_NM = 0.03;
const DEFAULT_TRACE_MIN_SAMPLE_GAP_MS = 1_500;
const DEFAULT_CURVE_STEPS = 8;

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
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
