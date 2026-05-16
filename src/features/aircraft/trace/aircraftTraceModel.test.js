import assert from "node:assert/strict";

import {
  buildAircraftTraceCurve,
  downsampleTracePoints,
  mergeTraceHistory,
  normalizeAdsbTracePayload,
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

{
  const normalized = normalizeAdsbTracePayload({
    timestamp: 1_778_840_413.111,
    trace: [
      [0, 42.1, -71.0, "ground", 12, 182, 1, null],
      [15.5, 42.2, -70.9, 12500, 310.4, 190.2, 0, 512],
      ["bad", 42.3, -70.8, 13000, 320, 200, 0, 640],
    ],
  });

  assert.equal(normalized.length, 2);
  assert.deepEqual(normalized[0], {
    timestampMs: 1_778_840_413_111,
    lat: 42.1,
    lon: -71.0,
    altitude: 0,
    onGround: true,
    velocity: 12,
    track: 182,
    baroRate: null,
  });
  assert.deepEqual(normalized[1], {
    timestampMs: 1_778_840_428_611,
    lat: 42.2,
    lon: -70.9,
    altitude: 12500,
    onGround: false,
    velocity: 310.4,
    track: 190.2,
    baroRate: 512,
  });
}

{
  const merged = mergeTraceHistory({
    fallbackHistory: [
      { lat: 42.0, lon: -71.0, timestampMs: 1_000 },
      { lat: 42.01, lon: -70.99, timestampMs: 2_000 },
    ],
    recentTrace: [
      { lat: 41.95, lon: -71.05, timestampMs: 500 },
      { lat: 42.01, lon: -70.99, timestampMs: 2_000 },
      { lat: 42.02, lon: -70.98, timestampMs: 3_000 },
    ],
  });

  assert.deepEqual(
    merged.map((point) => point.timestampMs),
    [500, 1_000, 2_000, 3_000],
  );
}

{
  const downsampled = downsampleTracePoints(
    Array.from({ length: 12 }, (_, index) => ({
      lat: 40 + index,
      lon: -70 - index,
      timestampMs: index * 1000,
    })),
    5,
  );

  assert.equal(downsampled.length, 5);
  assert.equal(downsampled[0].timestampMs, 0);
  assert.equal(downsampled.at(-1).timestampMs, 11_000);
}

console.log("aircraftTraceModel.test.js ok");
