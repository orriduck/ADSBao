import assert from "node:assert/strict";
import {
  THREE_OSM_ACCEPTANCE_MIN_ROUTE_TRANSITIONS,
  parseThreeOsmRoutePathSnapshot,
  resolveThreeOsmRouteWorkload,
  serializeThreeOsmRoutePath,
  threeOsmRouteEndpointMatches,
} from "./threeOsmRouteWorkload";

const airports = [
  { icao: "KOWD", lat: 42.1905, lon: -71.1729 },
  { icao: "KBED", lat: 42.47, lon: -71.289 },
  { icao: "KBVY", lat: 42.5842, lon: -70.9161 },
];
const first = resolveThreeOsmRouteWorkload({
  enabled: true,
  revision: 0,
  center: { lat: 42.3656, lon: -71.0096 },
  nearbyAirports: airports,
});
const second = resolveThreeOsmRouteWorkload({
  enabled: true,
  revision: 1,
  center: { lat: 42.3656, lon: -71.0096 },
  nearbyAirports: airports,
});

assert.equal(first.active, true);
assert.equal(first.path.length, 2);
assert.notEqual(first.destinationId, second.destinationId);
assert.notDeepEqual(first.path, second.path);
assert.equal(
  threeOsmRouteEndpointMatches(first.path, [first.path[0], first.path[1]]),
  true,
);
assert.equal(
  threeOsmRouteEndpointMatches(first.path, [second.path[0], second.path[1]]),
  false,
);
assert.equal(THREE_OSM_ACCEPTANCE_MIN_ROUTE_TRANSITIONS, 6);

const routeSnapshot = serializeThreeOsmRoutePath([
  [42.3656, -71.0096],
  ["invalid", -72],
  [null, -72],
  [91, -72],
  [40.6413, -73.7781],
]);
assert.equal(
  routeSnapshot,
  serializeThreeOsmRoutePath([
    [42.3656, -71.0096],
    [40.6413, -73.7781],
  ]),
);
assert.deepEqual(parseThreeOsmRoutePathSnapshot(routeSnapshot), [
  [42.3656, -71.0096],
  [40.6413, -73.7781],
]);

assert.deepEqual(
  resolveThreeOsmRouteWorkload({
    enabled: true,
    revision: 4,
    center: { lat: 42.3656, lon: -71.0096 },
    nearbyAirports: [airports[0]],
  }),
  { active: false, revision: 4, path: [], destinationId: "" },
);
assert.equal(
  resolveThreeOsmRouteWorkload({
    enabled: false,
    revision: 2,
    center: { lat: 42.3656, lon: -71.0096 },
    nearbyAirports: airports,
  }).active,
  false,
);

console.log("threeOsmRouteWorkload.test.ts ok");
