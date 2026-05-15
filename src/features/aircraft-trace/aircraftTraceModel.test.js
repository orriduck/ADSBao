import assert from "node:assert/strict";

import {
  buildAircraftTraceCurve,
  createAircraftTraceTracker,
} from "./aircraftTraceModel.js";

{
  const tracker = createAircraftTraceTracker({
    maxSamples: 4,
    maxAgeMs: 30_000,
    minDistanceNm: 0.01,
    minSampleGapMs: 1_000,
  });

  const firstPass = tracker.update(
    [
      { icao24: "abc123", lat: 42.0, lon: -71.0 },
      { icao24: "def456", lat: 42.1, lon: -71.1 },
    ],
    1_000,
  );

  assert.equal(firstPass[0].traceHistory.length, 1);
  assert.equal(firstPass[1].traceHistory.length, 1);

  const secondPass = tracker.update(
    [
      { icao24: "abc123", lat: 42.01, lon: -70.99 },
      { icao24: "def456", lat: 42.1, lon: -71.1 },
    ],
    4_000,
  );

  assert.equal(secondPass[0].traceHistory.length, 2);
  assert.deepEqual(secondPass[0].traceHistory[0], {
    lat: 42.0,
    lon: -71.0,
    time: 1_000,
  });
  assert.deepEqual(secondPass[0].traceHistory[1], {
    lat: 42.01,
    lon: -70.99,
    time: 4_000,
  });
  assert.equal(
    secondPass[1].traceHistory.length,
    1,
    "stationary aircraft should not grow a duplicate trace sample",
  );

  const thirdPass = tracker.update(
    [{ icao24: "abc123", lat: 42.02, lon: -70.98 }],
    40_500,
  );

  assert.equal(thirdPass[0].traceHistory.length, 1);
  assert.deepEqual(thirdPass[0].traceHistory[0], {
    lat: 42.02,
    lon: -70.98,
    time: 40_500,
  });
}

{
  const tracker = createAircraftTraceTracker({
    maxSamples: 3,
    maxAgeMs: 60_000,
    minDistanceNm: 0.001,
    minSampleGapMs: 0,
  });

  tracker.update([{ icao24: "abc123", lat: 42.0, lon: -71.0 }], 1_000);
  tracker.update([{ icao24: "abc123", lat: 42.01, lon: -71.0 }], 2_000);
  tracker.update([{ icao24: "abc123", lat: 42.02, lon: -71.0 }], 3_000);
  const fourthPass = tracker.update(
    [{ icao24: "abc123", lat: 42.03, lon: -71.0 }],
    4_000,
  );

  assert.equal(fourthPass[0].traceHistory.length, 3);
  assert.deepEqual(
    fourthPass[0].traceHistory.map((point) => point.time),
    [2_000, 3_000, 4_000],
  );
}

{
  const curve = buildAircraftTraceCurve([
    { lat: 42.0, lon: -71.0 },
    { lat: 42.02, lon: -70.99 },
    { lat: 42.04, lon: -70.96 },
  ]);

  assert.ok(curve.length > 3, "curve should densify the input points");
  assert.deepEqual(curve[0], [42.0, -71.0]);
  assert.deepEqual(curve.at(-1), [42.04, -70.96]);
}

console.log("aircraftTraceModel.test.js ok");
