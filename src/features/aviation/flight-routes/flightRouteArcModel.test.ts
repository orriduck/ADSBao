import assert from "node:assert/strict";

import {
  resolveFocusedFlightFullRoutePath,
  resolveFocusedFlightRouteArcPath,
} from "./flightRouteArcModel";

const focalAircraft = {
  flightRoute: {
    origin: { lat: 42.3656, lon: -71.0096 },
    destination: { lat: 33.9416, lon: -118.4085 },
  },
};

{
  const path = resolveFocusedFlightRouteArcPath({
    focalAircraft,
    from: { lat: 41.8, lon: -86.2 },
    segments: 4,
  });
  assert.deepEqual(path[0], [41.8, -86.2]);
  assert.deepEqual(path.at(-1), [33.9416, -118.4085]);
}

{
  const path = resolveFocusedFlightFullRoutePath({
    focalAircraft,
    segments: 4,
  });
  assert.deepEqual(path[0], [42.3656, -71.0096]);
  assert.deepEqual(path.at(-1), [33.9416, -118.4085]);
}

{
  const path = resolveFocusedFlightRouteArcPath({
    focalAircraft: { flightRoute: null },
    from: { lat: 41.8, lon: -86.2 },
  });
  assert.deepEqual(
    path,
    [],
    "another selected aircraft must never supply the focal flight route",
  );
}

console.log("flightRouteArcModel.test.ts ok");
