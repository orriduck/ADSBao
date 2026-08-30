import assert from "node:assert/strict";
import {
  classifyThreeOsmRoadTier,
  resolveThreeOsmAerowayWidthWorld,
  resolveThreeOsmBuildingHeights,
  resolveThreeOsmRoadWidthWorld,
} from "./threeOsmVectorContextGeometry";
import { createThreeOsmVectorContextScene } from "./threeOsmVectorContextScene";

assert.equal(classifyThreeOsmRoadTier("motorway"), "major");
assert.equal(classifyThreeOsmRoadTier("secondary"), "minor");
assert.equal(classifyThreeOsmRoadTier("service"), "service");
assert.equal(classifyThreeOsmRoadTier("path"), null);

const majorWidth = resolveThreeOsmRoadWidthWorld({
  tier: "major",
  centerLat: 42.3656,
  zoom: 13,
});
const minorWidth = resolveThreeOsmRoadWidthWorld({
  tier: "minor",
  centerLat: 42.3656,
  zoom: 13,
});
const serviceWidth = resolveThreeOsmRoadWidthWorld({
  tier: "service",
  centerLat: 42.3656,
  zoom: 13,
});
assert.ok(majorWidth > minorWidth);
assert.ok(minorWidth > serviceWidth);
assert.ok(
  resolveThreeOsmAerowayWidthWorld({
    className: "runway",
    centerLat: 42.3656,
    zoom: 13,
  })! >
    resolveThreeOsmAerowayWidthWorld({
      className: "taxiway",
      centerLat: 42.3656,
      zoom: 13,
    })!,
);
assert.equal(
  resolveThreeOsmAerowayWidthWorld({
    className: "gate",
    centerLat: 42.3656,
    zoom: 13,
  }),
  null,
);
assert.deepEqual(resolveThreeOsmBuildingHeights({}), {
  minimum: 0,
  height: 12,
});
assert.deepEqual(
  resolveThreeOsmBuildingHeights({
    render_min_height: 15,
    render_height: 10,
  }),
  { minimum: 15, height: 18 },
);
assert.deepEqual(
  resolveThreeOsmBuildingHeights({ render_height: 999 }),
  { minimum: 0, height: 180 },
);

const labelScene = createThreeOsmVectorContextScene({
  geometry: {
    roadPositions: {
      major: new Float32Array(),
      minor: new Float32Array(),
      service: new Float32Array(),
    },
    surfacePositions: {
      water: new Float32Array([0, 0.04, 0, 4, 0.04, 0, 0, 0.04, 4]),
      natural: new Float32Array(),
      developed: new Float32Array(),
      aeroway: new Float32Array(),
    },
    buildingRoofPositions: new Float32Array(),
    buildingWallPositions: new Float32Array(),
    labels: [
      {
        id: "vector:place:boston",
        text: "Boston",
        kind: "place",
        className: "city",
        x: 12,
        z: -8,
        priority: 349,
      },
    ],
    diagnostics: {
      tileCount: 1,
      decodeFailures: 0,
      roadFeatures: 0,
      roadSegments: 0,
      roadSourcePoints: 0,
      buildings: 0,
      buildingRoofTriangles: 0,
      buildingSourcePoints: 0,
      surfaceFeatures: 1,
      surfaceWaterFeatures: 1,
      surfaceNaturalFeatures: 0,
      surfaceDevelopedFeatures: 0,
      surfaceAerowayFeatures: 0,
      surfaceTriangles: 1,
      surfaceSourcePoints: 3,
      surfaceSkippedFeatures: 0,
      labelCandidates: 1,
      labelCount: 1,
      labelAerodromes: 0,
      labelPlaces: 1,
      labelRoads: 0,
      labelWaters: 0,
      labelSkippedFeatures: 0,
      skippedFeatures: 0,
      vertexCount: 0,
    },
  },
  theme: "dark",
});
assert.equal(labelScene.labels.length, 1);
assert.equal(labelScene.surfaceFeatures, 1);
assert.equal(labelScene.group.children[0].name, "three-osm-vector-surface-water");
assert.equal(labelScene.labels[0].kind, "vector-place");
assert.deepEqual(labelScene.labels[0].position.toArray(), [12, 2.5, -8]);

console.log("threeOsmVectorContextScene.test.ts ok");
