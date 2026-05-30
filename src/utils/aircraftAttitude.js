// Derives a 2.5D attitude (roll / pitch) for an aircraft marker from the
// ADS-B data we already have. Inputs: track (deg true), baroRate (ft/min),
// and timestamps of successive samples. Outputs are clamped angles in
// degrees so callers can feed them straight into CSS rotateX / rotateY.
//
// The math is intentionally simple — this is a visual cue, not a physics
// model. Turn rate (deg/s) drives bank, vertical rate (ft/min) drives
// pitch, both with conservative caps so the marker reads as "tilted into
// the turn / pitched up while climbing" instead of capsizing.
//
// Pure functions are exported for testing. `createAttitudeTracker()`
// wraps the per-marker state (previous track, previous time, smoothed
// values) so the call-site stays a one-liner.

import { toFiniteNumber } from "./math.js";

export const ROLL_LIMIT_DEG = 35;
export const PITCH_LIMIT_DEG = 12;

// Turn rate (deg/s) → roll (deg). 4.4 deg of bank per deg/s of turn lands a
// standard-rate turn (3 deg/s) at ~13 deg bank and saturates at the limit
// around 8 deg/s. Empirically this reads as "leaning into the turn" without
// flipping on noisy data.
export const TURN_RATE_TO_ROLL = 4.4;

// Vertical rate (ft/min) → pitch (deg). 600 fpm → 4 deg up; 1800 fpm → 12
// deg (capped). Climb/descent envelopes for jet traffic fit comfortably.
export const VERTICAL_RATE_TO_PITCH = 1 / 150;

// Above this gap we treat the previous sample as stale and reset turn-rate
// estimation. Avoids divide-by-tiny-dt and avoids resurrecting an old turn
// when a marker re-enters the viewport.
export const STALE_SAMPLE_GAP_MS = 8_000;

// Exponential-smoothing factor applied to roll/pitch between data updates.
// 0.35 keeps the marker responsive (a fresh sample moves ~35% toward the
// new target) while filtering single-frame jitter. CSS transitions on the
// element pick up the rest of the smoothing for the eye.
export const ATTITUDE_SMOOTHING = 0.35;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// Number(null) coerces to 0, which would silently turn "no previous track"
// into "track was 0". Reject nullish inputs explicitly before delegating to
// toFiniteNumber.
const finiteOrNull = (value) => {
  if (value == null) return null;
  return toFiniteNumber(value);
};

/**
 * Normalize an angle in degrees to (-180, 180]. Useful for working with
 * heading deltas where 359 → 1 should read as +2, not -358.
 *
 * @param {number} deg
 * @returns {number}
 */
export function normalizeAngle(deg) {
  if (!Number.isFinite(deg)) return 0;
  let result = deg % 360;
  if (result > 180) result -= 360;
  else if (result <= -180) result += 360;
  return result;
}

/**
 * Shortest signed delta between two compass headings, in degrees, in the
 * range (-180, 180]. Positive = clockwise turn.
 *
 * @param {number} fromDeg
 * @param {number} toDeg
 * @returns {number}
 */
export function shortestHeadingDelta(fromDeg, toDeg) {
  const from = finiteOrNull(fromDeg);
  const to = finiteOrNull(toDeg);
  if (from == null || to == null) return 0;
  return normalizeAngle(to - from);
}

/**
 * Turn rate in deg/sec given two samples. Returns 0 when the sample gap
 * is missing, non-positive, or too large to trust.
 *
 * @param {{ prevTrack?: number, currTrack?: number, prevTime?: number, currTime?: number }} sample
 * @returns {number}
 */
export function computeTurnRate({ prevTrack, currTrack, prevTime, currTime }) {
  const prev = finiteOrNull(prevTrack);
  const curr = finiteOrNull(currTrack);
  const pt = finiteOrNull(prevTime);
  const ct = finiteOrNull(currTime);
  if (prev == null || curr == null || pt == null || ct == null) return 0;
  const dtMs = ct - pt;
  if (dtMs <= 0 || dtMs > STALE_SAMPLE_GAP_MS) return 0;
  const delta = shortestHeadingDelta(prev, curr);
  return delta / (dtMs / 1000);
}

/**
 * Map a turn rate (deg/sec) to a bank angle (deg), clamped to ±ROLL_LIMIT_DEG.
 *
 * @param {number} turnRateDegPerSec
 * @returns {number}
 */
export function computeRoll(turnRateDegPerSec) {
  const value = finiteOrNull(turnRateDegPerSec);
  if (value == null) return 0;
  return clamp(value * TURN_RATE_TO_ROLL, -ROLL_LIMIT_DEG, ROLL_LIMIT_DEG);
}

/**
 * Map a vertical rate (ft/min) to a pitch angle (deg), clamped to
 * ±PITCH_LIMIT_DEG. Positive = nose up.
 *
 * @param {number | null | undefined} verticalRateFpm
 * @returns {number}
 */
export function computePitch(verticalRateFpm) {
  const value = finiteOrNull(verticalRateFpm);
  if (value == null) return 0;
  return clamp(
    value * VERTICAL_RATE_TO_PITCH,
    -PITCH_LIMIT_DEG,
    PITCH_LIMIT_DEG,
  );
}

/**
 * Exponential smoothing toward a target value. Used so a single noisy
 * sample doesn't snap the marker through a large bank or pitch step.
 *
 * @param {number} current
 * @param {number} target
 * @param {number} alpha 0..1; higher = more responsive
 * @returns {number}
 */
export function smoothToward(current, target, alpha = ATTITUDE_SMOOTHING) {
  const c = finiteOrNull(current) ?? 0;
  const t = finiteOrNull(target) ?? 0;
  const a = clamp(finiteOrNull(alpha) ?? ATTITUDE_SMOOTHING, 0, 1);
  return c + (t - c) * a;
}

/**
 * @typedef {Object} AttitudeSample
 * @property {number | null | undefined} track   Track (deg true).
 * @property {number | null | undefined} baroRate Vertical rate (ft/min).
 * @property {number} [time] Sample timestamp (ms epoch). Defaults to Date.now().
 *
 * @typedef {Object} AttitudeState
 * @property {number} roll  Smoothed bank, deg, clamped to ±ROLL_LIMIT_DEG.
 * @property {number} pitch Smoothed pitch, deg, clamped to ±PITCH_LIMIT_DEG.
 */

/**
 * Per-marker attitude tracker. Holds the previous track sample and the
 * smoothed roll/pitch so successive calls produce a stable, low-jitter
 * attitude that the renderer can apply to a CSS transform.
 *
 * @returns {{
 *   update(sample: AttitudeSample): AttitudeState,
 *   reset(): void,
 *   peek(): AttitudeState,
 * }}
 */
export function createAttitudeTracker() {
  let prevTrack = null;
  let prevTime = null;
  let roll = 0;
  let pitch = 0;

  return {
    update(sample) {
      const time = finiteOrNull(sample?.time) ?? Date.now();
      const currTrack = finiteOrNull(sample?.track);
      const verticalRate = finiteOrNull(sample?.baroRate);

      const turnRate = computeTurnRate({
        prevTrack,
        currTrack,
        prevTime,
        currTime: time,
      });
      const targetRoll = computeRoll(turnRate);
      const targetPitch = computePitch(verticalRate);

      roll = smoothToward(roll, targetRoll);
      pitch = smoothToward(pitch, targetPitch);

      if (currTrack != null) {
        prevTrack = currTrack;
        prevTime = time;
      }

      return { roll, pitch };
    },
    reset() {
      prevTrack = null;
      prevTime = null;
      roll = 0;
      pitch = 0;
    },
    peek() {
      return { roll, pitch };
    },
  };
}
