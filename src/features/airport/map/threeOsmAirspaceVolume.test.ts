import assert from "node:assert/strict";
import { buildThreeOsmAirspaceGeometry } from "./threeOsmAirspaceGeometry";
import {
  buildThreeOsmNearbyAirspaceCueGeometry,
  buildThreeOsmSelectedAirspaceVolumeGeometry,
} from "./threeOsmAirspaceVolume";
import { lonLatToTileCoordinate } from "./threeOsmProjection";

const prepared = buildThreeOsmAirspaceGeometry({
  airspaceFeatures: [
    {
      properties: {
        id: "selected",
        classLabel: "B",
        lowerLimitLabel: "2000 ft MSL",
        upperLimitLabel: "7000 ft MSL",
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-71.02, 42.35],
          [-71.01, 42.35],
          [-71.01, 42.36],
          [-71.02, 42.35],
        ]],
      },
    },
    {
      properties: {
        id: "nearby",
        classLabel: "E",
        lowerLimitLabel: "700 ft AGL",
        upperLimitLabel: "FL 60",
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-71.005, 42.36],
          [-71, 42.36],
          [-71, 42.365],
          [-71.005, 42.36],
        ]],
      },
    },
  ],
  showAirspaces: true,
  tileCenter: lonLatToTileCoordinate(-71.0096, 42.3656, 10),
  centerLat: 42.3656,
  zoom: 10,
});

const selected = prepared.featuresById.selected;
const selectedVolume = buildThreeOsmSelectedAirspaceVolumeGeometry(selected);
assert.equal(selectedVolume.topPositions.length, selected.positions.length);
assert.equal(selectedVolume.triangles, selected.positions.length / 6 * 2);
assert.ok(selectedVolume.posts > 0 && selectedVolume.posts <= 24);
assert.equal(
  selectedVolume.topPositions.every(
    (value, index) => index % 3 !== 1 || value === selected.cueTopY,
  ),
  true,
);

const nearbyCues = buildThreeOsmNearbyAirspaceCueGeometry({
  prepared,
  selectedAirspaceId: "selected",
});
assert.deepEqual(nearbyCues.featureIds, ["nearby"]);
assert.equal(nearbyCues.features, 1);
assert.equal(nearbyCues.segments, 3);
assert.equal(nearbyCues.positionsByTier["transition-controlled"].length, 18);

console.log("threeOsmAirspaceVolume.test.ts ok");
