import assert from "node:assert/strict";

import {
  buildTraceFitPoints,
  resolveTraceFitCenterAnchor,
} from "./mapFitTraceModel";

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
    "route endpoints should not inflate trace fitting",
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

{
  const points = buildTraceFitPoints({
    traces: [],
    routePath: [
      [49.19, -123.18],
      [-33.94, 151.18],
    ],
    allowRouteOnly: true,
  });

  assert.deepEqual(
    points,
    [
      [49.19, -123.18],
      [-33.94, 151.18],
    ],
    "full-route view can frame origin to destination before samples arrive",
  );
}

{
  const points = buildTraceFitPoints({
    traces: [
      {
        tracePoints: Array.from({ length: 1_000 }, (_, index) => ({
          lat: 30 + index / 100,
          lon: -120 + index / 200,
        })),
      },
    ],
  });
  assert.ok(points.length <= 4, "fit geometry virtualizes a long recorded run");
  assert.deepEqual(points[0], [30, -120]);
  assert.deepEqual(points[1], [39.99, -115.005]);
}

{
  assert.deepEqual(
    resolveTraceFitCenterAnchor({ lat: "42.36", lon: "-71.01" }),
    [42.36, -71.01],
    "finite inferred aircraft positions can anchor trace fitting",
  );
  assert.equal(
    resolveTraceFitCenterAnchor({ lat: "bad", lon: "-71.01" }),
    null,
    "invalid inferred positions should not recenter the map",
  );
}

console.log("mapFitTraceModel.test.ts ok");
