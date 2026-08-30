import assert from "node:assert/strict";
import * as THREE from "three";
import { resolveThreeOsmVisualPalette } from "./threeOsmAccessibilityPreferences";
import { lonLatToTileCoordinate } from "./threeOsmProjection";
import { createThreeOsmRunwayScene } from "./threeOsmRunwayScene";

const runwayScene = createThreeOsmRunwayScene({
  runwayCollection: {
    features: [
      {
        geometry: {
          coordinates: [
            [-71.02, 42.36],
            [-70.99, 42.37],
          ],
        },
        properties: { id: "04R/22L", widthFt: 150 },
      },
      {
        geometry: { coordinates: [[null, 42.3], [-71, 42.4]] },
        properties: { id: "invalid" },
      },
    ],
  },
  tileCenter: lonLatToTileCoordinate(-71.0096, 42.3656, 10),
  centerLat: 42.3656,
  palette: resolveThreeOsmVisualPalette({
    theme: "light",
    contrastMode: "standard",
  }),
  contrastMode: "standard",
});

assert.equal(runwayScene.runwayCount, 1);
assert.equal(runwayScene.segmentCount, 1);
assert.equal(runwayScene.vertexCount, 6);
assert.ok(runwayScene.group.getObjectByName("three-osm-runway-halo"));
assert.ok(runwayScene.group.getObjectByName("three-osm-runway-surfaces"));
const surface = runwayScene.group.getObjectByName(
  "three-osm-runway-surfaces",
);
const halo = runwayScene.group.getObjectByName("three-osm-runway-halo");
assert.ok(surface instanceof THREE.Mesh);
assert.ok(halo instanceof THREE.Mesh);
assert.equal(surface.material.transparent, true);
assert.equal(surface.material.opacity, 0.48);
assert.equal(halo.material.transparent, true);
assert.equal(halo.material.opacity, 0.34);
assert.ok(surface.renderOrder > halo.renderOrder);
const surfacePositions = surface.geometry.getAttribute("position");
const haloPositions = halo.geometry.getAttribute("position");
assert.equal(surfacePositions.count, 6);
assert.equal(haloPositions.count, 6);
const surfaceWidth = Math.hypot(
  surfacePositions.getX(0) - surfacePositions.getX(1),
  surfacePositions.getZ(0) - surfacePositions.getZ(1),
);
const haloWidth = Math.hypot(
  haloPositions.getX(0) - haloPositions.getX(1),
  haloPositions.getZ(0) - haloPositions.getZ(1),
);
assert.ok(surfaceWidth >= 3);
assert.ok(haloWidth >= surfaceWidth + 2.99);

console.log("threeOsmRunwayScene.test.ts ok");
