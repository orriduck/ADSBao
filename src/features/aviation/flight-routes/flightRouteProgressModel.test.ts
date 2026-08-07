import assert from "node:assert/strict";

import { resolveFlightRouteProgress } from "./flightRouteProgressModel";

const route = {
  origin: { lat: 0, lon: 0 },
  destination: { lat: 0, lon: 90 },
};

assert.equal(resolveFlightRouteProgress({ route, aircraft: {} }), null);

assert.equal(
  resolveFlightRouteProgress({
    route,
    aircraft: { lat: 0, lon: 0, onGround: true },
  }),
  0,
);

assert.equal(
  resolveFlightRouteProgress({
    route,
    aircraft: { lat: 0, lon: 90, onGround: true },
  }),
  1,
);

assert.ok(
  Math.abs(
    (resolveFlightRouteProgress({
      route,
      aircraft: { lat: 0, lon: 45 },
    }) || 0) - 0.5,
  ) < 1e-9,
);

assert.ok(
  Math.abs(
    (resolveFlightRouteProgress({
      route,
      aircraft: { lat: 10, lon: 45 },
    }) || 0) - 0.5,
  ) < 0.01,
  "off-route positions project to their nearest point along the route",
);

console.log("flightRouteProgressModel.test.ts ok");
