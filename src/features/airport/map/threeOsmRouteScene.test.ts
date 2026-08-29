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
  contrastMode: "standard",
});

assert.equal(route.pointCount, 3);
assert.ok(route.group.getObjectByName("three-osm-flight-route-line"));
assert.ok(route.group.getObjectByName("three-osm-flight-route-destination"));
assert.equal(route.group.children.length, 2);

const forcedRoute = createThreeOsmRouteScene({
  path: [
    [42.3656, -71.0096],
    [40.6413, -73.7781],
  ],
  tileCenter: lonLatToTileCoordinate(-71.0096, 42.3656, 10),
  centerLat: 42.3656,
  theme: "dark",
  contrastMode: "forced",
  systemColors: {
    canvas: "rgb(0, 0, 0)",
    canvasText: "rgb(255, 255, 255)",
    highlight: "rgb(0, 128, 255)",
    highlightText: "rgb(255, 255, 255)",
  },
});
const forcedRouteLine = forcedRoute.group.getObjectByName(
  "three-osm-flight-route-line",
) as import("three").Line;
assert.equal(
  (forcedRouteLine.material as import("three").LineDashedMaterial).color.getHex(),
  0xffffff,
);
assert.equal(
  (forcedRouteLine.material as import("three").LineDashedMaterial).opacity,
  1,
);

const empty = createThreeOsmRouteScene({
  path: [[42.3656, -71.0096]],
  tileCenter: lonLatToTileCoordinate(-71.0096, 42.3656, 10),
  centerLat: 42.3656,
  theme: "light",
  contrastMode: "standard",
});
assert.equal(empty.pointCount, 0);
assert.equal(empty.group.children.length, 0);

console.log("threeOsmRouteScene.test.ts ok");
