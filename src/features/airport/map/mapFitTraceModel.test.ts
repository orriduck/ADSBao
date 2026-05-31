import assert from "node:assert/strict";

import { buildTraceFitPoints } from "./mapFitTraceModel";

{
  const points = buildTraceFitPoints({
    traces: [
      {
        tracePoints: [
          { lat: 42, lon: -71 },
          { lat: 43, lon: -72 },
        ],
      },
      {
        tracePoints: [
          { lat: 40, lon: -73 },
        ],
      },
    ],
    routePath: [
      [51, -0.4],
      [50, -20],
    ],
  });

  assert.deepEqual(points, [
    [42, -71],
    [43, -72],
    [40, -73],
    [51, -0.4],
    [50, -20],
  ]);
}

{
  const points = buildTraceFitPoints({
    traces: [
      {
        tracePoints: [
          { lat: 42, lon: -71 },
        ],
      },
    ],
    routeEndpoints: {
      origin: { lat: 51, lon: -0.4 },
      destination: { lat: 40.6, lon: -73.8 },
    },
  });

  assert.deepEqual(
    points,
    [[42, -71]],
    "non-FlightAware route endpoints should not inflate trace fitting",
  );
}

{
  const points = buildTraceFitPoints({
    traces: [],
    routePath: [
      [49.19, -123.18],
      [-33.94, 151.18],
    ],
  });

  assert.deepEqual(
    points,
    [],
    "route-only geometry should not trigger flight-page trace fitting",
  );
}

console.log("mapFitTraceModel.test.ts ok");
