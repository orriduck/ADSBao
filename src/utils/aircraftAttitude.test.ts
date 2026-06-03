import assert from "node:assert/strict";

import { createAttitudeTracker } from "./aircraftAttitude";

const ATTITUDE_SMOOTHING = 0.35;
const STALE_SAMPLE_GAP_MS = 8_000;

const nearlyEqual = (actual, expected, tolerance = 1e-9) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
};

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
  assert.ok(second.pitch > first.pitch && second.pitch <= 12);

  // Wrap-around left turn: 358 → 2 ≡ +4°, but here we go the other way.
  const third = tracker.update({ track: 100, baroRate: 0, time: 4_000 });
  assert.ok(third.roll < second.roll, "left turn pulls roll back down");
  assert.ok(third.pitch < second.pitch, "vr=0 starts unwinding pitch");

  // Reset clears everything
  tracker.reset();
  assert.deepEqual(tracker.peek(), { roll: 0, pitch: 0 });
}

// Tracker: wrap-aware turns across 0/360 use the shortest signed heading delta
{
  const tracker = createAttitudeTracker();
  tracker.update({ track: 359, baroRate: 0, time: 0 });
  const wrappedRight = tracker.update({ track: 1, baroRate: 0, time: 2_000 });
  assert.ok(wrappedRight.roll > 0, "359 to 1 banks right, not hard left");

  tracker.reset();
  tracker.update({ track: 1, baroRate: 0, time: 0 });
  const wrappedLeft = tracker.update({ track: 359, baroRate: 0, time: 2_000 });
  assert.ok(wrappedLeft.roll < 0, "1 to 359 banks left, not hard right");
}

// Tracker: roll and pitch stay clamped even on extreme input
{
  const tracker = createAttitudeTracker();
  tracker.update({ track: 0, baroRate: 99_999, time: 0 });
  const steepTurn = tracker.update({ track: 180, baroRate: 99_999, time: 1_000 });

  assert.ok(steepTurn.roll <= 35);
  assert.ok(steepTurn.pitch <= 12);
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
