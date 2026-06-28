// Offline replay harness for the adaptive position smoothing algorithm.
//
// Replays a recorded per-target ADS-B fix sequence through the real
// anchor -> adaptive-extrapolation -> critically-damped-easing pipeline
// (src/utils/aircraftMotion) at a simulated, zoom-matched frame cadence, and
// computes reproducible display-quality metrics. No map, no canvas — if the
// algorithm is correct here, the canvas mapping is a passive projection.
//
// All quality metrics are measured on the DISPLAYED path (what the user sees),
// not on disp-minus-target: a smooth marker following a momentarily-jumpy target
// is correct, so the metrics must not penalise it.

import {
  beginAircraftMotionState,
  calculateAircraftVisualPosition,
  computeTargetPosition,
} from "../../../utils/aircraftMotion";

type ReplayFix = {
  receiveTime: number;
  positionTime: number;
  source: string;
  lat: number;
  lon: number;
  gs: number;
  track: number;
  gnd: boolean;
};

export type Fixture = {
  hex: string;
  callsign: string;
  category: string;
  medGs: number;
  maxGs: number;
  fixes: ReplayFix[];
};

export type ReplayFrame = {
  t: number;
  dispLat: number;
  dispLon: number;
  targetLat: number;
  targetLon: number;
  sourceChanged: boolean; // a source-changing data update was applied this frame
  gs: number;
};

// Mirrors resolveMotionIntervalMs() in AircraftCanvasLayer for non-focal planes.
const motionIntervalForZoom = (zoom: number) => {
  if (zoom >= 13) return 100;
  if (zoom >= 9) return 500;
  return 1000;
};

// Web-mercator ground resolution (meters per CSS pixel) at a latitude/zoom.
const metersPerPixel = (lat: number, zoom: number) =>
  (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;

const metersBetween = (aLat: number, aLon: number, bLat: number, bLon: number) => {
  const M = 111_320;
  const avgLatRad = (((aLat + bLat) / 2) * Math.PI) / 180;
  const north = (bLat - aLat) * M;
  const east = (bLon - aLon) * M * Math.cos(avgLatRad);
  return Math.hypot(north, east);
};

// Local meters offset of b relative to a (east, north), for vector math.
const offsetMeters = (aLat: number, aLon: number, bLat: number, bLon: number) => {
  const M = 111_320;
  const avgLatRad = (((aLat + bLat) / 2) * Math.PI) / 180;
  return {
    east: (bLon - aLon) * M * Math.cos(avgLatRad),
    north: (bLat - aLat) * M,
  };
};

// Replay one fixture at one zoom by running a continuous frame clock at the zoom
// cadence (like the RAF motion loop) and applying each recorded observation as a
// data update (setData -> beginAircraftMotionState, carrying the prior state) at
// the tick its receiveTime falls on.
export const replayFixture = (fixture: Fixture, zoom: number): ReplayFrame[] => {
  const cadence = motionIntervalForZoom(zoom);
  const fixes = fixture.fixes;
  if (!fixes.length) return [];
  const start = fixes[0].receiveTime;
  const end = fixes[fixes.length - 1].receiveTime;

  const frames: ReplayFrame[] = [];
  let state: any = null;
  let nextFix = 0;
  let prevSource: string | null = null;

  for (let t = start; t <= end + 1; t += cadence) {
    let sourceChanged = false;
    let gs = state?.velocity ?? 0;
    while (nextFix < fixes.length && fixes[nextFix].receiveTime <= t) {
      const fx = fixes[nextFix];
      if (prevSource != null && fx.source !== prevSource) sourceChanged = true;
      prevSource = fx.source;
      state = beginAircraftMotionState(
        {
          lat: fx.lat,
          lon: fx.lon,
          velocity: fx.gs,
          track: fx.track,
          onGround: fx.gnd,
          positionTime: fx.positionTime,
        },
        t,
        state,
      );
      gs = fx.gs;
      nextFix += 1;
    }
    if (!state) continue;
    const disp = calculateAircraftVisualPosition(state, t, zoom);
    const target = computeTargetPosition(state, t);
    frames.push({
      t,
      dispLat: disp.lat,
      dispLon: disp.lon,
      targetLat: target.lat,
      targetLon: target.lon,
      sourceChanged,
      gs,
    });
  }
  return frames;
};

const percentile = (values: number[], p: number) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
};

export type SmoothingMetrics = {
  // "No jitter" headline: p95 per-frame displayed step (px) over STEADY frames
  // (target essentially still). For a converged low-pass filter this is ~0.
  steadyJitterPxP95: number;
  steadyFrames: number;
  // Slow-target smoothness: max backward (reversal) component between consecutive
  // displayed steps, in px. Asserted only for sub-LOW_KT targets, where the task
  // requires the marker never move opposite the fixes ("drift then snap back").
  maxReversalPx: number;
  // Lag bound: max |displayed - target| in meters (the catch-up clamp caps it).
  lagM: number;
  // Slow targets: max distance displayed strays OUTSIDE the bounding box of all
  // raw fixes (the ADS-B noise envelope). Must be ~0.
  envelopeExceedM: number;
  // Source-switch no-teleport: largest single-frame displayed step (px) on a
  // source-change frame. Compared against the largest raw fix-to-fix step (px):
  // the eased marker must never jump more in one frame than the data itself
  // moved between two fixes (alpha < 1 guarantees this — proves no discontinuity).
  sourceSwitchStepPx: number;
  maxRawFixStepPx: number;
  frames: number;
};

const STEADY_TARGET_STEP_PX = 0.02; // target considered "still" below this

export const computeMetrics = (
  fixture: Fixture,
  frames: ReplayFrame[],
  zoom: number,
): SmoothingMetrics => {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  for (const fx of fixture.fixes) {
    minLat = Math.min(minLat, fx.lat);
    maxLat = Math.max(maxLat, fx.lat);
    minLon = Math.min(minLon, fx.lon);
    maxLon = Math.max(maxLon, fx.lon);
  }

  // Largest raw fix-to-fix step in px (the reference for "no teleport").
  let maxRawFixStepPx = 0;
  for (let i = 1; i < fixture.fixes.length; i += 1) {
    const a = fixture.fixes[i - 1];
    const b = fixture.fixes[i];
    const mpp = metersPerPixel(b.lat, zoom);
    maxRawFixStepPx = Math.max(
      maxRawFixStepPx,
      metersBetween(a.lat, a.lon, b.lat, b.lon) / mpp,
    );
  }

  const steadyStepsPx: number[] = [];
  let maxReversalPx = 0;
  let lagM = 0;
  let envelopeExceedM = 0;
  let sourceSwitchStepPx = 0;
  let prevStep: { east: number; north: number; px: number } | null = null;

  for (let i = 0; i < frames.length; i += 1) {
    const f = frames[i];
    const mpp = metersPerPixel(f.dispLat, zoom);

    lagM = Math.max(
      lagM,
      metersBetween(f.dispLat, f.dispLon, f.targetLat, f.targetLon),
    );

    const overLat = Math.max(0, f.dispLat - maxLat, minLat - f.dispLat);
    const overLon = Math.max(0, f.dispLon - maxLon, minLon - f.dispLon);
    if (overLat > 0 || overLon > 0) {
      envelopeExceedM = Math.max(
        envelopeExceedM,
        metersBetween(
          f.dispLat,
          f.dispLon,
          Math.min(Math.max(f.dispLat, minLat), maxLat),
          Math.min(Math.max(f.dispLon, minLon), maxLon),
        ),
      );
    }

    if (i === 0) {
      prevStep = null;
      continue;
    }
    const prev = frames[i - 1];
    const dispOff = offsetMeters(prev.dispLat, prev.dispLon, f.dispLat, f.dispLon);
    const dispStepPx = Math.hypot(dispOff.east, dispOff.north) / mpp;
    const targetOff = offsetMeters(
      prev.targetLat,
      prev.targetLon,
      f.targetLat,
      f.targetLon,
    );
    const targetStepPx = Math.hypot(targetOff.east, targetOff.north) / mpp;

    // Steady-state jitter: displayed motion while the target is essentially still.
    if (targetStepPx < STEADY_TARGET_STEP_PX) steadyStepsPx.push(dispStepPx);

    // Largest single-frame displayed step on a source-change frame.
    if (f.sourceChanged) {
      sourceSwitchStepPx = Math.max(sourceSwitchStepPx, dispStepPx);
    }

    // Reversal: backward component of this step relative to the previous step.
    const step = { east: dispOff.east, north: dispOff.north, px: dispStepPx };
    if (prevStep && prevStep.px > 1e-9 && step.px > 1e-9) {
      const dot =
        (prevStep.east * step.east + prevStep.north * step.north) /
        (Math.hypot(prevStep.east, prevStep.north) || 1);
      // dot is the signed projection (m) of this step onto the previous heading.
      // Negative -> reversal; convert the backward portion to px.
      if (dot < 0) maxReversalPx = Math.max(maxReversalPx, -dot / mpp);
    }
    prevStep = step;
  }

  return {
    steadyJitterPxP95: percentile(steadyStepsPx, 95),
    steadyFrames: steadyStepsPx.length,
    maxReversalPx,
    lagM,
    envelopeExceedM,
    sourceSwitchStepPx,
    maxRawFixStepPx,
    frames: frames.length,
  };
};

export const ZOOM_REGIMES = [
  { name: "far", zoom: 7 },
  { name: "mid", zoom: 10 },
  { name: "high", zoom: 14 },
] as const;

// Pass thresholds per zoom regime.
//  - steadyJitterPxP95: the "no wiggle" headline; tightens as you zoom out, must
//    be effectively zero at far/mid.
//  - maxReversalPx (slow targets only): no "drift then snap back".
//  - lagM: bounded by the catch-up clamp.
//  - envelopeExceedM (slow only): never beyond the ADS-B noise envelope.
// Source-switch is asserted relatively in the test (disp step <= max raw fix
// step) rather than with a fixed px bound, since the raw multi-source data
// genuinely jumps and the eased marker must only avoid jumping MORE than it.
export const THRESHOLDS: Record<
  string,
  {
    steadyJitterPxP95: number;
    maxReversalPx: number;
    lagM: number;
    envelopeExceedM: number;
  }
> = {
  far: { steadyJitterPxP95: 0.05, maxReversalPx: 0.05, lagM: 600, envelopeExceedM: 2 },
  mid: { steadyJitterPxP95: 0.15, maxReversalPx: 0.2, lagM: 600, envelopeExceedM: 2 },
  high: { steadyJitterPxP95: 0.6, maxReversalPx: 0.8, lagM: 600, envelopeExceedM: 2 },
};
