import assert from "node:assert/strict";
import * as THREE from "three";
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
const routeGlow = route.group.getObjectByName(
  "three-osm-flight-route-glow",
) as THREE.Mesh;
const routeLine = route.group.getObjectByName(
  "three-osm-flight-route-line",
) as THREE.Mesh;
assert.ok(routeGlow instanceof THREE.Mesh);
assert.ok(routeLine instanceof THREE.Mesh);
assert.notEqual(routeGlow.geometry, routeLine.geometry);
routeGlow.geometry.computeBoundingBox();
routeLine.geometry.computeBoundingBox();
const glowBounds = routeGlow.geometry.boundingBox;
const lineBounds = routeLine.geometry.boundingBox;
assert.ok(glowBounds && lineBounds);
const glowSpan =
  glowBounds.max.x - glowBounds.min.x + glowBounds.max.z - glowBounds.min.z;
const lineSpan =
  lineBounds.max.x - lineBounds.min.x + lineBounds.max.z - lineBounds.min.z;
assert.ok(glowSpan > lineSpan);
assert.ok(route.group.getObjectByName("three-osm-flight-route-destination"));
assert.equal(route.group.children.length, 3);

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
) as THREE.Mesh;
assert.equal(
  (forcedRouteLine.material as THREE.MeshBasicMaterial).color.getHex(),
  0xffffff,
);
assert.equal(
  (forcedRouteLine.material as THREE.MeshBasicMaterial).opacity,
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
