import assert from "node:assert/strict";
import * as THREE from "three";
import { resolveThreeOsmVisualPalette } from "./threeOsmAccessibilityPreferences";
import { lonLatToTileCoordinate } from "./threeOsmProjection";
import { createThreeOsmGroundLightingScene } from "./threeOsmGroundLightingScene";

const tileCenter = lonLatToTileCoordinate(-71.0096, 42.3656, 14);
const palette = resolveThreeOsmVisualPalette({
  theme: "dark",
  contrastMode: "standard",
});
const runwayLighting = {
  features: [
    { properties: { role: "edge" }, geometry: { type: "LineString", coordinates: [[-71.01, 42.36], [-71.01, 42.37]] } },
    { properties: { role: "edge-caution" }, geometry: { type: "LineString", coordinates: [[-71.011, 42.36], [-71.011, 42.365]] } },
    { properties: { role: "centerline" }, geometry: { type: "LineString", coordinates: [[-71.01, 42.36], [-71.01, 42.37]] } },
    { properties: { role: "endbar" }, geometry: { type: "LineString", coordinates: [[-71.011, 42.36], [-71.009, 42.36]] } },
    { properties: { role: "reil" }, geometry: { type: "Point", coordinates: [-71.012, 42.36] } },
    { properties: { role: "reil" }, geometry: { type: "Point", coordinates: [null, 42.36] } },
  ],
};
const surfaceCollection = {
  features: [
    { properties: { kind: "taxiway" }, geometry: { type: "LineString", coordinates: [[-71.015, 42.36], [-71.005, 42.37]] } },
    { properties: { kind: "apron" }, geometry: { type: "Polygon", coordinates: [] } },
  ],
};

const hidden = createThreeOsmGroundLightingScene({
  runwayLighting,
  surfaceCollection,
  tileCenter,
  centerLat: 42.3656,
  zoom: 14,
  theme: "light",
  palette,
  contrastMode: "standard",
});
assert.equal(hidden.visible, false);
assert.equal(hidden.group.children.length, 0);

const belowDetail = createThreeOsmGroundLightingScene({
  runwayLighting,
  surfaceCollection,
  tileCenter,
  centerLat: 42.3656,
  zoom: 13,
  theme: "dark",
  palette,
  contrastMode: "standard",
});
assert.equal(belowDetail.visible, false);
assert.equal(belowDetail.drawBatches, 0);

const scene = createThreeOsmGroundLightingScene({
  runwayLighting,
  surfaceCollection,
  tileCenter,
  centerLat: 42.3656,
  zoom: 14,
  theme: "dark",
  palette,
  contrastMode: "standard",
});
assert.equal(scene.visible, true);
assert.equal(scene.runwayFeatures, 5);
assert.equal(scene.runwaySegments, 4);
assert.ok(scene.runwayDashes > 0);
assert.equal(scene.reilCount, 1);
assert.equal(scene.taxiwayFeatures, 1);
assert.equal(scene.taxiwaySegments, 1);
assert.ok(scene.taxiwayDashes > 0);
assert.equal(scene.drawBatches, 5);
assert.ok(scene.vertexCount > 0);
assert.ok(scene.group.getObjectByName("three-osm-runway-white-lights") instanceof THREE.Mesh);
assert.ok(scene.group.getObjectByName("three-osm-runway-amber-lights") instanceof THREE.Mesh);
assert.ok(scene.group.getObjectByName("three-osm-taxiway-blue-lights") instanceof THREE.Mesh);
assert.ok(scene.group.getObjectByName("three-osm-taxiway-green-lights") instanceof THREE.Mesh);
assert.ok(scene.group.getObjectByName("three-osm-runway-reil-lights") instanceof THREE.InstancedMesh);
const runwayLights = scene.group.getObjectByName("three-osm-runway-white-lights");
const reilLights = scene.group.getObjectByName("three-osm-runway-reil-lights");
assert.ok(runwayLights instanceof THREE.Mesh);
assert.ok(reilLights instanceof THREE.InstancedMesh);
assert.equal(runwayLights.material.opacity, 0.38);
assert.equal(reilLights.material.opacity, 0.64);

console.log("threeOsmGroundLightingScene.test.ts ok");
