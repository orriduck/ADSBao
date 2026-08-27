import assert from "node:assert/strict";

import { computeTraceGeometry } from "./traceGeometry";

{
  const tracePoints = Array.from({ length: 8 }, (_, index) => ({
    lat: 42 + index * 0.002,
    lon: -71,
    timestampMs: 1_700_000_000_000 + index * 30_000,
    altitude: 2_000 + index * 100,
  }));

  const geometry = computeTraceGeometry({ tracePoints, maxRenderPoints: 80 });

  assert.ok(geometry, "dense trace should still produce geometry");
  assert.ok(
    geometry.labelPoints.length <= 3,
    "labels should thin out when adjacent samples are geographically close",
  );
}

{
  const tracePoints = Array.from({ length: 9 }, (_, index) => ({
    lat: 42 + index * 0.08,
    lon: -71,
    timestampMs: 1_700_000_000_000 + index * 30_000,
    altitude: 2_000 + index * 100,
  }));

  const geometry = computeTraceGeometry({ tracePoints, maxRenderPoints: 80 });

  assert.ok(geometry, "spread trace should still produce geometry");
  assert.ok(
    geometry.labelPoints.length <= 5,
    "labels should keep a global cap even when samples are spread out",
  );
  assert.ok(
    geometry.labelPoints.every((point) => point.timestampMs <= tracePoints[5].timestampMs),
    "labels should leave clearance around the live trace head",
  );
}

{
  const base = 1_700_000_000_000 - (1_700_000_000_000 % 60_000);
  const tracePoints = Array.from({ length: 6 }, (_, minute) => [
    {
      lat: 42 + minute * 0.12,
      lon: -71,
      timestampMs: base + minute * 60_000 + 5_000,
      altitude: 2_000 + minute * 100,
    },
    {
      lat: 42.01 + minute * 0.12,
      lon: -70.99,
      timestampMs: base + minute * 60_000 + 45_000,
      altitude: 2_050 + minute * 100,
    },
  ]).flat();

  const geometry = computeTraceGeometry({ tracePoints, maxRenderPoints: 80 });

  assert.ok(geometry, "same-minute tracking samples should still produce geometry");
  assert.ok(
    geometry.samplePoints.some(
      (point) => (point.timestampMs - base) % 60_000 === 5_000,
    ),
    "sample dots should retain the first live point in each minute",
  );
  assert.ok(
    geometry.samplePoints.some(
      (point) => (point.timestampMs - base) % 60_000 === 45_000,
    ),
    "sample dots should retain the later live point in each minute",
  );
  const labelMinutes = geometry.labelPoints.map((point) =>
    Math.floor(point.timestampMs / 60_000),
  );
  assert.equal(
    new Set(labelMinutes).size,
    labelMinutes.length,
    "display labels should not repeat the same rendered minute",
  );
}

{
  const tracePoints = [
    { lat: 42, lon: -71, timestampMs: 1_700_000_000_000 },
    { lat: 42.01, lon: -70.99, timestampMs: 1_700_000_015_000, inferred: true },
  ];
  assert.ok(
    computeTraceGeometry({ tracePoints, maxRenderPoints: 80 }),
    "a real fix and its inferred tracking head should render before a minute elapses",
  );
}

{
  const base = 1_700_000_000_000 - (1_700_000_000_000 % 600_000);
  const tracePoints = Array.from({ length: 32 }, (_, minute) => ({
    lat: 42 + minute * 0.03,
    lon: -71 + minute * 0.02,
    timestampMs: base + minute * 60_000,
    altitude: 2_000 + minute * 100,
  }));

  const geometry = computeTraceGeometry({
    tracePoints,
    maxRenderPoints: 80,
    fullTrace: true,
  });

  assert.ok(geometry, "full trace should still produce geometry");
  assert.deepEqual(
    geometry.labelPoints.map((point) => (point.timestampMs - base) / 60_000),
    [0, 10, 20],
    "full trace labels should land at ten-minute intervals",
  );
}

console.log("traceGeometry.test.ts ok");
