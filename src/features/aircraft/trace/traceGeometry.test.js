import assert from "node:assert/strict";

import { computeTraceGeometry } from "./traceGeometry.js";

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
}

console.log("traceGeometry.test.js ok");
