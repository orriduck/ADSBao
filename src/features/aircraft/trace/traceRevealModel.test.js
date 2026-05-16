import assert from "node:assert/strict";
import test from "node:test";

import {
  getTraceRevealKey,
  getTraceLabelRevealDelay,
  shouldRenderCommittedTrace,
} from "./traceRevealModel.js";

test("does not render committed trace geometry for a previous aircraft", () => {
  assert.equal(
    shouldRenderCommittedTrace({
      aircraftHex: "A7BBE9",
      committedAircraftHex: "A12345",
      tracePoints: [{ lat: 42, lon: -71 }, { lat: 43, lon: -72 }],
    }),
    false,
  );
});

test("renders committed trace geometry when the aircraft still matches", () => {
  assert.equal(
    shouldRenderCommittedTrace({
      aircraftHex: "A7BBE9",
      committedAircraftHex: "A7BBE9",
      tracePoints: [{ lat: 42, lon: -71 }, { lat: 43, lon: -72 }],
    }),
    true,
  );
});

test("staggered trace labels start during the line reveal", () => {
  const first = getTraceLabelRevealDelay({
    index: 0,
    growthDurationMs: 900,
    staggerMs: 70,
  });
  const second = getTraceLabelRevealDelay({
    index: 1,
    growthDurationMs: 900,
    staggerMs: 70,
  });

  assert.equal(first, 495);
  assert.equal(second, 565);
});

test("trace reveal key is stable across live updates for the same aircraft", () => {
  const first = getTraceRevealKey({
    aircraftHex: "A7BBE9",
    tracePoints: [
      { timestampMs: 1_000, lat: 42, lon: -71 },
      { timestampMs: 2_000, lat: 43, lon: -72 },
    ],
  });
  const second = getTraceRevealKey({
    aircraftHex: "A7BBE9",
    tracePoints: [
      { timestampMs: 1_000, lat: 42, lon: -71 },
      { timestampMs: 3_000, lat: 44, lon: -73 },
    ],
  });

  assert.equal(first, second);
});
