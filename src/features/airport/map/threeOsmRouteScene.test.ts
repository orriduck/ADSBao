import assert from "node:assert/strict";
import { lonLatToTileCoordinate } from "./threeOsmProjection";
import { createThreeOsmRouteScene } from "./threeOsmRouteScene";

const route = createThreeOsmRouteScene({
  path: [
    [42.3656, -71.0096],
    [41.9, -72.1],
    [40.6413, -73.7781],
  ],
  tileCenter: lonLatToTileCoordinate(-71.0096, 42.3656, 10),
  centerLat: 42.3656,
  theme: "dark",
});

assert.equal(route.pointCount, 3);
assert.ok(route.group.getObjectByName("three-osm-flight-route-line"));
assert.ok(route.group.getObjectByName("three-osm-flight-route-destination"));
assert.equal(route.group.children.length, 2);

const empty = createThreeOsmRouteScene({
  path: [[42.3656, -71.0096]],
  tileCenter: lonLatToTileCoordinate(-71.0096, 42.3656, 10),
  centerLat: 42.3656,
  theme: "light",
});
assert.equal(empty.pointCount, 0);
assert.equal(empty.group.children.length, 0);

console.log("threeOsmRouteScene.test.ts ok");
