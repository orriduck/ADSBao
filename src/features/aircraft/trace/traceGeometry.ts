// Pure trace-geometry computation. Takes raw trace points and produces the
// single curved trail plus sparse points/labels that SelectedAircraftTrace
// draws. Kept side-effect-free so render can memoize / defer / batch it.

import {
  buildAircraftTraceCurve,
  dedupeTracePointsByMinuteLatest,
  downsampleTracePoints,
  segmentTracePoints,
} from "./aircraftTraceModel";
import { getDistanceNm } from "../../../utils/aircraftTrafficIntent";

const DEFAULT_TRACE_MAX_LABELS = 5;
const DEFAULT_TRACE_LABEL_MIN_DISTANCE_NM = 2;

function buildTraceSamplePoints(points) {
  const usable = points.slice(0, -1);
  if (usable.length <= 8) return usable;

  const stride = Math.max(1, Math.floor(usable.length / 8));
  return usable.filter((_, index) => index % stride === 0);
}

// Sparser sample for human-readable text labels. Fewer items than the dot
// markers so the labels don't pile on top of each other along the trail.
function buildTraceLabelPoints(
  points,
  {
    maxLabels = DEFAULT_TRACE_MAX_LABELS,
    minDistanceNm = DEFAULT_TRACE_LABEL_MIN_DISTANCE_NM,
  } = {},
) {
  const usable = points.slice(0, -1);
  if (usable.length === 0) return [];

  const selected = [];
  for (let index = usable.length - 1; index >= 0; index -= 1) {
    const point = usable[index];
    const separated = selected.every((selectedPoint) => {
      const distanceNm = getDistanceNm(
        point.lat,
        point.lon,
        selectedPoint.lat,
        selectedPoint.lon,
      );
      return Number.isFinite(distanceNm) && distanceNm >= minDistanceNm;
    });
    if (!separated) continue;
    selected.push(point);
    if (selected.length >= maxLabels) break;
  }

  return selected.reverse();
}

export function computeTraceGeometry({
  tracePoints = [],
  maxRenderPoints,
  curveSteps = 5,
}) {
  if (!Array.isArray(tracePoints) || tracePoints.length < 2) return null;

  const minuteTracePoints = dedupeTracePointsByMinuteLatest(tracePoints);
  if (minuteTracePoints.length < 2) return null;

  const segmented = segmentTracePoints(minuteTracePoints);
  const segments = segmented.segments
    .map((segment, index) => {
      if (!Array.isArray(segment.points) || segment.points.length < 2) {
        return null;
      }
      const sampled = downsampleTracePoints(segment.points, maxRenderPoints);
      const curve = buildAircraftTraceCurve(sampled, curveSteps);
      if (curve.length < 2) return null;
      return {
        id: `segment-${index}`,
        curve,
        samplePoints: buildTraceSamplePoints(sampled),
        labelPoints: buildTraceLabelPoints(sampled),
      };
    })
    .filter(Boolean);
  const connectors = segmented.connectors
    .map((connector, index) => {
      const points = Array.isArray(connector.points) ? connector.points : [];
      const curve = points
        .filter((point) => Number.isFinite(point?.lat) && Number.isFinite(point?.lon))
        .map((point) => [point.lat, point.lon]);
      if (curve.length < 2) return null;
      return {
        id: `connector-${index}`,
        confidence: connector.confidence,
        gapMs: connector.gapMs,
        curve,
      };
    })
    .filter(Boolean);

  if (segments.length === 0 && connectors.length === 0) return null;

  return {
    segments,
    connectors,
    curve: segments[0]?.curve || connectors[0]?.curve || [],
    samplePoints: segments.flatMap((segment) => segment.samplePoints),
    labelPoints: segments.flatMap((segment) => segment.labelPoints),
  };
}
