// Pure trace-geometry computation. Takes raw trace points and produces the
// final render geometry (curve + bands + sample points + sweep coords) that
// SelectedAircraftTrace draws. Kept side-effect-free so the render component
// can memoize / defer / batch it however it likes — calculation is decoupled
// from rendering.

import {
  buildAircraftTraceCurve,
  downsampleTracePoints,
} from "./aircraftTraceModel.js";

function sliceCurve(coords, startIndex, endIndex) {
  if (endIndex - startIndex < 1) return [];
  return coords.slice(startIndex, endIndex + 1);
}

function buildTraceBands(coords, bandCount) {
  const segmentCount = Math.max(0, coords.length - 1);
  if (segmentCount < 1) return [];

  return Array.from({ length: bandCount }, (_, bandIndex) => {
    const startIndex = Math.floor((segmentCount * bandIndex) / bandCount);
    const endIndex = Math.floor((segmentCount * (bandIndex + 1)) / bandCount);
    return {
      index: bandIndex,
      startIndex,
      endIndex,
      coords: sliceCurve(coords, startIndex, endIndex),
      emphasis: bandIndex / Math.max(1, bandCount - 1),
    };
  }).filter((band) => band.coords.length >= 2);
}

function buildTraceSamplePoints(points) {
  const usable = points.slice(0, -1);
  if (usable.length <= 8) return usable;

  const stride = Math.max(1, Math.floor(usable.length / 8));
  return usable.filter((_, index) => index % stride === 0);
}

function buildHeadSweepCoords(coords, tailRatio) {
  const startIndex = Math.max(
    0,
    Math.floor(coords.length - Math.max(8, coords.length * tailRatio)),
  );
  return coords.slice(startIndex);
}

export function computeTraceGeometry({
  tracePoints = [],
  maxRenderPoints,
  bandCount,
  sweepTailRatio,
  curveSteps = 5,
}) {
  if (!Array.isArray(tracePoints) || tracePoints.length < 2) return null;

  const sampled = downsampleTracePoints(tracePoints, maxRenderPoints);
  const curve = buildAircraftTraceCurve(sampled, curveSteps);
  if (curve.length < 2) return null;

  return {
    curve,
    bands: buildTraceBands(curve, bandCount),
    samplePoints: buildTraceSamplePoints(sampled),
    sweepCoords: buildHeadSweepCoords(curve, sweepTailRatio),
    headIndex: Math.max(1, curve.length - 1),
  };
}
