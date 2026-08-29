import assert from "node:assert/strict";
import * as THREE from "three";
import { resolveThreeOsmVisualPalette } from "./threeOsmAccessibilityPreferences";
import { lonLatToTileCoordinate } from "./threeOsmProjection";
import { createThreeOsmSurfaceScene } from "./threeOsmSurfaceScene";

const tileCenter = lonLatToTileCoordinate(-71.0096, 42.3656, 11);
const palette = resolveThreeOsmVisualPalette({
  theme: "light",
  contrastMode: "standard",
});
const surfaceCollection = {
  features: [
    {
      properties: { id: "apron-1", kind: "apron" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-71.02, 42.36],
          [-71.01, 42.36],
          [-71.01, 42.37],
          [-71.02, 42.37],
          [-71.02, 42.36],
        ]],
      },
    },
    {
      properties: { id: "taxiway-1", kind: "taxiway" },
      geometry: {
        type: "LineString",
        coordinates: [[-71.02, 42.36], [-71.01, 42.365], [-71, 42.37]],
      },
    },
    {
      properties: { id: "taxilane-1", kind: "taxilane" },
      geometry: {
        type: "LineString",
        coordinates: [[-71.01, 42.36], [-71, 42.365]],
      },
    },
    {
      properties: { id: "runway-ignored", kind: "runway" },
      geometry: {
        type: "LineString",
        coordinates: [[-71.02, 42.36], [-70.99, 42.37]],
      },
    },
    {
      properties: { id: "invalid", kind: "taxiway" },
      geometry: { type: "LineString", coordinates: [[null, 42.3], [-71, 42.4]] },
    },
  ],
};

const hidden = createThreeOsmSurfaceScene({
  surfaceCollection,
  tileCenter,
  centerLat: 42.3656,
  zoom: 10,
  palette,
  contrastMode: "standard",
});
assert.equal(hidden.visible, false);
assert.equal(hidden.group.children.length, 0);
assert.equal(hidden.vertexCount, 0);

const visible = createThreeOsmSurfaceScene({
  surfaceCollection,
  tileCenter,
  centerLat: 42.3656,
  zoom: 11,
  palette,
  contrastMode: "standard",
});
assert.equal(visible.visible, true);
assert.equal(visible.apronCount, 1);
assert.equal(visible.apronTriangles, 2);
assert.equal(visible.taxiwayCount, 1);
assert.equal(visible.taxiwaySegments, 2);
assert.equal(visible.taxilaneCount, 1);
assert.equal(visible.taxilaneSegments, 1);
assert.ok(visible.vertexCount > 0);
assert.ok(visible.group.getObjectByName("three-osm-apron-fills") instanceof THREE.Mesh);
assert.ok(visible.group.getObjectByName("three-osm-apron-outlines") instanceof THREE.Mesh);
assert.ok(visible.group.getObjectByName("three-osm-taxiway-corridors") instanceof THREE.Mesh);
assert.ok(visible.group.getObjectByName("three-osm-taxilane-corridors") instanceof THREE.Mesh);
assert.equal(visible.group.children.length, 4, "surface complexity stays at four batched meshes");

console.log("threeOsmSurfaceScene.test.ts ok");
