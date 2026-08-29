import assert from "node:assert/strict";
import * as THREE from "three";
import { resolveThreeOsmVisualPalette } from "./threeOsmAccessibilityPreferences";
import { lonLatToTileCoordinate } from "./threeOsmProjection";
import { createThreeOsmRunwayApproachScene } from "./threeOsmRunwayApproachScene";

const tileCenter = lonLatToTileCoordinate(-71.0096, 42.3656, 10);
const lightPalette = resolveThreeOsmVisualPalette({
  theme: "light",
  contrastMode: "standard",
});

const lines = createThreeOsmRunwayApproachScene({
  visualization: {
    kind: "approach-lines",
    data: {
      features: [
        {
          geometry: {
            type: "LineString",
            coordinates: [[-71.01, 42.36], [-70.98, 42.37]],
          },
        },
        {
          geometry: {
            type: "LineString",
            coordinates: [[null, 42.36], [-70.98, 42.37]],
          },
        },
      ],
    },
  },
  tileCenter,
  centerLat: 42.3656,
  palette: lightPalette,
  contrastMode: "standard",
});
assert.equal(lines.kind, "approach-lines");
assert.equal(lines.featureCount, 1);
assert.ok(lines.dashCount > 1);
assert.equal(lines.vertexCount, lines.dashCount * 6);
const lineMesh = lines.group.getObjectByName("three-osm-runway-approach-lines");
assert.ok(lineMesh instanceof THREE.Mesh);
assert.equal(lines.group.children.length, 1, "all approach lines stay in one draw batch");

const beams = createThreeOsmRunwayApproachScene({
  visualization: {
    kind: "approach-beams",
    data: {
      features: [
        {
          geometry: {
            type: "Polygon",
            coordinates: [[
              [-71.01, 42.36],
              [-70.99, 42.365],
              [-71.0, 42.37],
              [-71.01, 42.36],
            ]],
          },
          properties: {
            beamOpacity: 0.22,
            gradientStart: [-71.01, 42.36],
            gradientEnd: [-71.0, 42.37],
          },
        },
      ],
    },
  },
  tileCenter,
  centerLat: 42.3656,
  palette: resolveThreeOsmVisualPalette({
    theme: "dark",
    contrastMode: "standard",
  }),
  contrastMode: "standard",
});
assert.equal(beams.kind, "approach-beams");
assert.equal(beams.featureCount, 1);
assert.equal(beams.triangleCount, 1);
assert.equal(beams.vertexCount, 3);
assert.ok(beams.group.getObjectByName("three-osm-runway-approach-beams"));
assert.equal(beams.group.children.length, 1, "all approach beams stay in one draw batch");
const beamMesh = beams.group.getObjectByName("three-osm-runway-approach-beams");
assert.ok(beamMesh instanceof THREE.Mesh);
const beamColors = beamMesh.geometry.getAttribute("color");
assert.equal(beamColors.itemSize, 4);
const beamAlphas = Array.from(
  { length: beamColors.count },
  (_, index) => beamColors.getW(index),
);
assert.ok(Math.max(...beamAlphas) > Math.min(...beamAlphas));

console.log("threeOsmRunwayApproachScene.test.ts ok");
