// Pure trace-geometry computation. Takes raw trace points and produces the
// single curved trail plus sparse points/labels that SelectedAircraftTrace
// draws. Kept side-effect-free so render can memoize / defer / batch it.

import {
  buildAircraftTraceCurve,
  downsampleTracePoints,
} from "./aircraftTraceModel.js";

function buildTraceSamplePoints(points) {
  const usable = points.slice(0, -1);
  if (usable.length <= 8) return usable;

  const stride = Math.max(1, Math.floor(usable.length / 8));
  return usable.filter((_, index) => index % stride === 0);
}

// Sparser sample for human-readable text labels. Fewer items than the dot
// markers so the labels don't pile on top of each other along the trail.
function buildTraceLabelPoints(points, maxLabels = 5) {
  const usable = points.slice(0, -1);
  if (usable.length === 0) return [];
  if (usable.length <= maxLabels) return usable;
  const stride = Math.max(1, Math.floor(usable.length / maxLabels));
  return usable.filter((_, index) => index % stride === 0);
}

export function computeTraceGeometry({
  tracePoints = [],
  maxRenderPoints,
  curveSteps = 5,
}) {
  if (!Array.isArray(tracePoints) || tracePoints.length < 2) return null;

  const sampled = downsampleTracePoints(tracePoints, maxRenderPoints);
  const curve = buildAircraftTraceCurve(sampled, curveSteps);
  if (curve.length < 2) return null;

  return {
    curve,
    samplePoints: buildTraceSamplePoints(sampled),
    labelPoints: buildTraceLabelPoints(sampled),
  };
}
