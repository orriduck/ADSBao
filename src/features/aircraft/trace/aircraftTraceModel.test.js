import assert from "node:assert/strict";

import {
  buildAircraftTraceCurve,
  downsampleTracePoints,
  mergeTraceHistory,
  mergeTracesByPriority,
  normalizeAdsbTracePayload,
  createAircraftTraceTracker,
  trimImplausibleTraceSegments,
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

{
  // Recent wins over full on overlap; live wins over both.
  const fullSource = [
    { lat: 42.0, lon: -71.0, timestampMs: 1_000, altitude: 5_000 },
    { lat: 42.01, lon: -70.99, timestampMs: 2_000, altitude: 6_000 },
    { lat: 42.02, lon: -70.98, timestampMs: 3_000, altitude: 7_000 },
  ];
  const recentSource = [
    { lat: 42.015, lon: -70.985, timestampMs: 2_500, altitude: 6_500 },
    { lat: 42.025, lon: -70.975, timestampMs: 3_000, altitude: 7_100 },
    { lat: 42.03, lon: -70.97, timestampMs: 4_000, altitude: 7_500 },
  ];
  const liveSource = [
    { lat: 42.035, lon: -70.965, timestampMs: 4_200, altitude: 7_600 },
  ];

  const merged = mergeTracesByPriority({
    sources: [
      { points: liveSource, priority: 2 },
      { points: recentSource, priority: 1 },
      { points: fullSource, priority: 0 },
    ],
  });

  // Recent should win at the 3_000 ms bucket (altitude 7_100, not 7_000).
  const at3 = merged.find((p) => p.timestampMs === 3_000);
  assert.equal(at3.altitude, 7_100, "recent should override full at overlap");

  // Live (priority 2) drops in its own bucket (4_200 → bucket 4) and
  // overrides the recent point at 4_000 (also bucket 4).
  const bucket4 = merged.filter((p) => Math.floor(p.timestampMs / 1000) === 4);
  assert.equal(bucket4.length, 1, "1-second bucket should collapse to one point");
  assert.equal(bucket4[0].timestampMs, 4_200, "live should win the 4s bucket");
  assert.equal(bucket4[0].altitude, 7_600);

  // Full-only points (1_000) survive when no higher-priority source has them.
  const at1 = merged.find((p) => p.timestampMs === 1_000);
  assert.equal(at1.altitude, 5_000);

  // Output is sorted ascending by timestamp.
  for (let i = 1; i < merged.length; i++) {
    assert.ok(merged[i].timestampMs >= merged[i - 1].timestampMs);
  }
}

{
  // Source order in the array doesn't matter — priority is explicit.
  const a = [{ lat: 1, lon: 1, timestampMs: 1_000, altitude: 100 }];
  const b = [{ lat: 1.5, lon: 1.5, timestampMs: 1_000, altitude: 200 }];
  const orderOne = mergeTracesByPriority({
    sources: [
      { points: a, priority: 0 },
      { points: b, priority: 5 },
    ],
  });
  const orderTwo = mergeTracesByPriority({
    sources: [
      { points: b, priority: 5 },
      { points: a, priority: 0 },
    ],
  });
  assert.equal(orderOne[0].altitude, 200);
  assert.equal(orderTwo[0].altitude, 200);
}

// --- trimImplausibleTraceSegments -----------------------------------

// Empty / too-short input passes through untouched.
assert.deepEqual(trimImplausibleTraceSegments([]), []);
assert.deepEqual(
  trimImplausibleTraceSegments([{ lat: 42, lon: -71, timestampMs: 1_000 }]),
  [{ lat: 42, lon: -71, timestampMs: 1_000 }],
);

// A normal cruise trace — 4 points over BOS area, ~5 min apart,
// reasonable ground speed — survives unchanged.
{
  const points = [
    { lat: 42.36, lon: -71.0, timestampMs: 1_700_000_000_000 },
    { lat: 42.40, lon: -71.2, timestampMs: 1_700_000_300_000 },
    { lat: 42.44, lon: -71.4, timestampMs: 1_700_000_600_000 },
    { lat: 42.48, lon: -71.6, timestampMs: 1_700_000_900_000 },
  ];
  assert.deepEqual(trimImplausibleTraceSegments(points), points);
}

// Stale persisted point that "jumps" several thousand miles in a few
// seconds — must be dropped. Only the contiguous tail (the legitimate
// fresh segment) is kept.
{
  const stale = { lat: 33.6, lon: -84.4, timestampMs: 1_700_000_000_000 }; // ATL
  const fresh = [
    { lat: 42.36, lon: -71.0, timestampMs: 1_700_000_010_000 }, // 10s later, BOS — implies ~Mach 80
    { lat: 42.40, lon: -71.2, timestampMs: 1_700_000_310_000 },
    { lat: 42.44, lon: -71.4, timestampMs: 1_700_000_610_000 },
  ];
  const trimmed = trimImplausibleTraceSegments([stale, ...fresh]);
  assert.deepEqual(trimmed, fresh);
}

// Multiple implausible jumps — only the segment after the LAST jump is
// kept, since everything before is suspect by association.
{
  const points = [
    { lat: 33.6, lon: -84.4, timestampMs: 1_700_000_000_000 },
    { lat: 51.5, lon: 0.0, timestampMs: 1_700_000_005_000 }, // ATL → LHR in 5s (jump 1)
    { lat: 51.6, lon: 0.1, timestampMs: 1_700_000_300_000 }, // normal cruise after
    { lat: 42.36, lon: -71.0, timestampMs: 1_700_000_310_000 }, // jump back to BOS (jump 2)
    { lat: 42.40, lon: -71.2, timestampMs: 1_700_000_610_000 }, // current segment
  ];
  const trimmed = trimImplausibleTraceSegments(points);
  assert.equal(trimmed.length, 2);
  assert.deepEqual(trimmed[0], points[3]);
  assert.deepEqual(trimmed[1], points[4]);
}

// Long-haul ocean gap with plausible cruise speed is preserved — no
// false positives. JFK → LHR is ~3000 nm; covered in ~6.5h ≈ 460 kt
// average. Each ~30 min gap implies ~230 nm @ ~460 kt.
{
  const points = [
    { lat: 40.64, lon: -73.78, timestampMs: 1_700_000_000_000 }, // JFK
    { lat: 42.0, lon: -69.0, timestampMs: 1_700_000_000_000 + 30 * 60 * 1000 },
    { lat: 44.0, lon: -60.0, timestampMs: 1_700_000_000_000 + 60 * 60 * 1000 },
    { lat: 50.0, lon: -30.0, timestampMs: 1_700_000_000_000 + 3 * 60 * 60 * 1000 },
    { lat: 51.47, lon: -0.45, timestampMs: 1_700_000_000_000 + 6.5 * 60 * 60 * 1000 }, // LHR
  ];
  assert.deepEqual(trimImplausibleTraceSegments(points), points);
}

console.log("aircraftTraceModel.test.js ok");
