import assert from "node:assert/strict";

import { subscribeAircraftMotionFrame } from "./aircraftMotionFrameLoop";

const originalDateNow = Date.now;
const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;

try {
  const epochNow = 1_700_000_003_000;
  Date.now = () => epochNow;
  globalThis.requestAnimationFrame = ((callback) => {
    callback(123);
    return 1;
  }) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = (() => {}) as typeof cancelAnimationFrame;

  let receivedNow = 0;
  subscribeAircraftMotionFrame((now) => {
    receivedNow = now;
    return false;
  });

  assert.equal(
    receivedNow,
    epochNow,
    "aircraft motion frame callbacks must receive epoch milliseconds, not the RAF timestamp",
  );
} finally {
  Date.now = originalDateNow;
  globalThis.requestAnimationFrame = originalRequestAnimationFrame;
  globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
}
