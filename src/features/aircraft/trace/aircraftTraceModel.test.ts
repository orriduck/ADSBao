import assert from "node:assert/strict";

import {
  buildAircraftTraceCurve,
  composeAircraftTrace,
  downsampleTracePoints,
  normalizeAdsbTracePayload,
  createAircraftTraceTracker,
  segmentTracePoints,
} from "./aircraftTraceModel";

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
  // Structural sharing: an unchanged aircraft keeps the same object
  // reference across polls, and a fully-unchanged tick returns the same
  // array reference (so the poller can skip setState).
  const tracker = createAircraftTraceTracker({
    maxSamples: 8,
    maxAgeMs: 60_000,
    minDistanceNm: 0.01,
    minSampleGapMs: 1_000,
  });

  const pass1 = tracker.update(
    [
      { icao24: "aaa111", lat: 42.0, lon: -71.0, altitude: 30000 },
      { icao24: "bbb222", lat: 43.0, lon: -72.0, altitude: 31000 },
    ],
    1_000,
  );
  // Identical feed on the next tick → same refs, same array.
  const pass2 = tracker.update(
    [
      { icao24: "aaa111", lat: 42.0, lon: -71.0, altitude: 30000 },
      { icao24: "bbb222", lat: 43.0, lon: -72.0, altitude: 31000 },
    ],
    4_000,
  );
  assert.equal(pass2, pass1, "unchanged tick returns the same array reference");
  assert.equal(pass2[0], pass1[0], "unchanged aircraft keeps the same object reference");
  assert.equal(pass2[1], pass1[1], "unchanged aircraft keeps the same object reference");

  // One aircraft moves enough to append a sample → that object is new,
  // the unchanged one is still shared, and the array reference changes.
  const pass3 = tracker.update(
    [
      { icao24: "aaa111", lat: 42.05, lon: -70.95, altitude: 30200 },
      { icao24: "bbb222", lat: 43.0, lon: -72.0, altitude: 31000 },
    ],
    7_000,
  );
  assert.notEqual(pass3, pass2, "a changed tick returns a new array reference");
  assert.notEqual(pass3[0], pass2[0], "moved aircraft gets a fresh object");
  assert.equal(pass3[1], pass2[1], "still-unchanged aircraft keeps its shared object");
  assert.equal(pass3[0].traceHistory.length, 2, "moving aircraft grows its trace");
  assert.equal(pass3[1].traceHistory.length, 1, "stationary aircraft trace unchanged");

  // A changed scalar field (altitude only, same position) still busts the
  // shared reference so consumers see the new value.
  const pass4 = tracker.update(
    [
      { icao24: "aaa111", lat: 42.05, lon: -70.95, altitude: 30200 },
      { icao24: "bbb222", lat: 43.0, lon: -72.0, altitude: 31500 },
    ],
    10_000,
  );
  assert.notEqual(pass4[1], pass3[1], "changed altitude busts the shared reference");
  assert.equal(pass4[1].altitude, 31500);
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
  // Recent wins over full on exact overlap; live wins over both.
  const fullSource = [
    { lat: 42.0, lon: -71.0, timestampMs: 60_000, altitude: 5_000 },
    { lat: 42.01, lon: -70.99, timestampMs: 120_000, altitude: 6_000 },
    { lat: 42.02, lon: -70.98, timestampMs: 180_000, altitude: 7_000 },
  ];
  const recentSource = [
    { lat: 42.025, lon: -70.975, timestampMs: 120_000, altitude: 7_100 },
    { lat: 42.03, lon: -70.97, timestampMs: 240_000, altitude: 7_500 },
  ];
  const liveSource = [
    { lat: 42.035, lon: -70.965, timestampMs: 240_000, altitude: 7_600 },
  ];

  const merged = composeAircraftTrace({
    mode: "focus",
    sources: {
      live: liveSource,
      recent: recentSource,
      full: fullSource,
    },
  }).points;

  // Recent should win at the 120_000 ms point (altitude 7_100, not 6_000).
  const at120 = merged.find((p) => p.timestampMs === 120_000);
  assert.equal(at120.altitude, 7_100, "recent should override full at overlap");

  // Live (priority 2) wins the exact 240_000 ms overlap with recent.
  const at240 = merged.find((p) => p.timestampMs === 240_000);
  assert.equal(at240.altitude, 7_600);

  // Full-only points survive when no higher-priority source has that minute.
  const at60 = merged.find((p) => p.timestampMs === 60_000);
  assert.equal(at60.altitude, 5_000);

  // Output is sorted ascending by timestamp.
  for (let i = 1; i < merged.length; i++) {
    assert.ok(merged[i].timestampMs >= merged[i - 1].timestampMs);
  }
}

{
  const merged = composeAircraftTrace({
    mode: "focus",
    sources: {
      full: [
        { lat: 42.0, lon: -71.0, timestampMs: 60_000, altitude: 5_000 },
        { lat: 42.01, lon: -70.99, timestampMs: 119_000, altitude: 5_500 },
        { lat: 42.02, lon: -70.98, timestampMs: 120_000, altitude: 6_000 },
      ],
      recent: [
        { lat: 42.03, lon: -70.97, timestampMs: 118_000, altitude: 6_500 },
      ],
    },
  }).points;

  assert.deepEqual(
    merged.map((point) => point.timestampMs),
    [119_000, 120_000],
    "same-minute trace points should collapse to the latest point in each minute",
  );
  assert.equal(merged[0].altitude, 5_500);
}

{
  const composed = composeAircraftTrace({
    mode: "selected",
    sources: {
      recent: [{ lat: 1, lon: 1, timestampMs: 1_000, altitude: 100 }],
      live: [{ lat: 1.5, lon: 1.5, timestampMs: 1_000, altitude: 200 }],
    },
  });

  assert.equal(composed.points[0].altitude, 200);
}

{
  // Normal dense points render as one authoritative segment.
  const points = [
    { lat: 42.0, lon: -71.0, timestampMs: 1_000 },
    { lat: 42.01, lon: -70.99, timestampMs: 31_000 },
    { lat: 42.02, lon: -70.98, timestampMs: 61_000 },
  ];
  const segmented = segmentTracePoints(points);

  assert.equal(segmented.segments.length, 1);
  assert.deepEqual(segmented.segments[0].points, points);
  assert.deepEqual(segmented.connectors, []);
}

{
  // Trace files can lag live positions by several minutes. Keep the
  // authoritative samples separate from the visual bridge so the map
  // does not pretend interpolated latency is real trace history.
  const points = [
    { lat: 42.0, lon: -71.0, timestampMs: 1_000 },
    { lat: 42.05, lon: -70.95, timestampMs: 61_000 },
    { lat: 42.2, lon: -70.7, timestampMs: 6 * 60_000 },
  ];
  const segmented = segmentTracePoints(points);

  assert.equal(segmented.segments.length, 2);
  assert.deepEqual(
    segmented.segments.map((segment) => segment.points.length),
    [2, 1],
  );
  assert.equal(segmented.connectors.length, 1);
  assert.deepEqual(segmented.connectors[0].points, [points[1], points[2]]);
  assert.equal(segmented.connectors[0].confidence, "low");
}

{
  // Very large gaps or impossible jumps are discontinuities, not
  // connectors. They should render as separate segments with no line
  // across the gap.
  const points = [
    { lat: 42.0, lon: -71.0, timestampMs: 1_000 },
    { lat: 42.01, lon: -70.99, timestampMs: 31_000 },
    { lat: 51.5, lon: 0.0, timestampMs: 90_000 },
    { lat: 51.55, lon: 0.05, timestampMs: 120_000 },
  ];
  const segmented = segmentTracePoints(points);

  assert.equal(segmented.segments.length, 2);
  assert.deepEqual(
    segmented.segments.map((segment) => segment.points),
    [points.slice(0, 2), points.slice(2)],
  );
  assert.deepEqual(segmented.connectors, []);
}

console.log("aircraftTraceModel.test.ts ok");
