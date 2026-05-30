import assert from "node:assert/strict";

import {
  ATTITUDE_SMOOTHING,
  PITCH_LIMIT_DEG,
  ROLL_LIMIT_DEG,
  STALE_SAMPLE_GAP_MS,
  computePitch,
  computeRoll,
  computeTurnRate,
  createAttitudeTracker,
  normalizeAngle,
  shortestHeadingDelta,
  smoothToward,
} from "./aircraftAttitude.js";

const nearlyEqual = (actual, expected, tolerance = 1e-9) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
};

// normalizeAngle: wraps into (-180, 180]
assert.equal(normalizeAngle(0), 0);
assert.equal(normalizeAngle(180), 180);
assert.equal(normalizeAngle(-180), 180);
assert.equal(normalizeAngle(190), -170);
assert.equal(normalizeAngle(-190), 170);
assert.equal(normalizeAngle(540), 180);
assert.equal(normalizeAngle(Number.NaN), 0);

// shortestHeadingDelta: wrap-aware across the 0/360 seam
assert.equal(shortestHeadingDelta(359, 1), 2);
assert.equal(shortestHeadingDelta(1, 359), -2);
assert.equal(shortestHeadingDelta(10, 20), 10);
assert.equal(shortestHeadingDelta(350, 10), 20);
assert.equal(shortestHeadingDelta(null, 10), 0);
assert.equal(shortestHeadingDelta(10, undefined), 0);

// computeTurnRate
assert.equal(
  computeTurnRate({ prevTrack: 100, currTrack: 110, prevTime: 0, currTime: 1000 }),
  10,
  "10° / 1s = 10 deg/s",
);
assert.equal(
  computeTurnRate({ prevTrack: 359, currTrack: 1, prevTime: 0, currTime: 2000 }),
  1,
  "wraps across 0/360",
);
assert.equal(
  computeTurnRate({ prevTrack: null, currTrack: 1, prevTime: 0, currTime: 2000 }),
  0,
  "missing prev track → 0",
);
assert.equal(
  computeTurnRate({ prevTrack: 1, currTrack: 1, prevTime: 0, currTime: 0 }),
  0,
  "non-positive dt → 0",
);
assert.equal(
  computeTurnRate({
    prevTrack: 10,
    currTrack: 90,
    prevTime: 0,
    currTime: STALE_SAMPLE_GAP_MS + 1,
  }),
  0,
  "gap beyond stale window → 0",
);

// computeRoll: clamped to ±35
assert.equal(computeRoll(0), 0);
assert.equal(computeRoll(2), 8.8); // 2 * 4.4
assert.equal(computeRoll(100), ROLL_LIMIT_DEG);
assert.equal(computeRoll(-100), -ROLL_LIMIT_DEG);
assert.equal(computeRoll(Number.NaN), 0);

// computePitch: clamped to ±12
assert.equal(computePitch(0), 0);
assert.equal(computePitch(600), 4);
assert.equal(computePitch(-600), -4);
assert.equal(computePitch(99_999), PITCH_LIMIT_DEG);
assert.equal(computePitch(-99_999), -PITCH_LIMIT_DEG);
assert.equal(computePitch(null), 0);
assert.equal(computePitch(undefined), 0);

// smoothToward: convex combination
nearlyEqual(smoothToward(0, 10, 0.5), 5);
nearlyEqual(smoothToward(10, 0, 1), 0);
nearlyEqual(smoothToward(10, 0, 0), 10);
// Defaults to ATTITUDE_SMOOTHING
nearlyEqual(smoothToward(0, 10), 10 * ATTITUDE_SMOOTHING);

// Tracker: roll/pitch from a sequence of samples
{
  const tracker = createAttitudeTracker();

  // First sample establishes baseline; no prior → turnRate=0, but
  // verticalRate still drives pitch immediately.
  const first = tracker.update({ track: 90, baroRate: 1500, time: 1_000 });
  assert.equal(first.roll, 0, "first sample has no turn history");
  nearlyEqual(first.pitch, 10 * ATTITUDE_SMOOTHING, 1e-9);

  // 20° right turn in 2s → 10 deg/s → 44 → clamped 35 → smoothed by 0.35
  const second = tracker.update({ track: 110, baroRate: 1500, time: 3_000 });
  nearlyEqual(second.roll, 35 * ATTITUDE_SMOOTHING, 1e-9);
  // Pitch continues smoothing toward 10 deg target
  assert.ok(second.pitch > first.pitch && second.pitch <= PITCH_LIMIT_DEG);

  // Wrap-around left turn: 358 → 2 ≡ +4°, but here we go the other way.
  const third = tracker.update({ track: 100, baroRate: 0, time: 4_000 });
  assert.ok(third.roll < second.roll, "left turn pulls roll back down");
  assert.ok(third.pitch < second.pitch, "vr=0 starts unwinding pitch");

  // Reset clears everything
  tracker.reset();
  assert.deepEqual(tracker.peek(), { roll: 0, pitch: 0 });
}

// Tracker: stale gap forgets the previous sample
{
  const tracker = createAttitudeTracker();
  tracker.update({ track: 0, baroRate: 0, time: 0 });
  const next = tracker.update({
    track: 90,
    baroRate: 0,
    time: STALE_SAMPLE_GAP_MS + 1,
  });
  assert.equal(next.roll, 0, "stale gap → turnRate=0 → roll decays to 0");
}

// Tracker: ignores undefined track without losing prior baseline
{
  const tracker = createAttitudeTracker();
  tracker.update({ track: 0, baroRate: 0, time: 0 });
  const withoutTrack = tracker.update({ track: null, baroRate: 600, time: 1_000 });
  nearlyEqual(withoutTrack.pitch, 4 * ATTITUDE_SMOOTHING, 1e-9);
  // Next sample with a track still produces a valid turn rate vs. the
  // original baseline (track=0 at t=0), not vs. the null sample.
  const resumed = tracker.update({ track: 30, baroRate: 600, time: 2_000 });
  assert.ok(resumed.roll > 0, "resumes turn-rate calc against last real track");
}

console.log("aircraftAttitude tests passed");
