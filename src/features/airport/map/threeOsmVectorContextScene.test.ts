import assert from "node:assert/strict";
import * as THREE from "three";
import {
  classifyThreeOsmRoadTier,
  resolveThreeOsmAerowayWidthWorld,
  resolveThreeOsmBuildingHeights,
  resolveThreeOsmRoadWidthWorld,
} from "./threeOsmVectorContextGeometry";
import { createThreeOsmVectorContextScene } from "./threeOsmVectorContextScene";

assert.equal(classifyThreeOsmRoadTier("motorway"), "motorway");
assert.equal(classifyThreeOsmRoadTier("primary"), "arterial");
assert.equal(classifyThreeOsmRoadTier("secondary"), "collector");
assert.equal(classifyThreeOsmRoadTier("minor"), "local");
assert.equal(classifyThreeOsmRoadTier("service"), "service");
assert.equal(classifyThreeOsmRoadTier("path"), null);

const motorwayWidth = resolveThreeOsmRoadWidthWorld({
  tier: "motorway",
  centerLat: 42.3656,
  zoom: 13,
});
const arterialWidth = resolveThreeOsmRoadWidthWorld({
  tier: "arterial",
  centerLat: 42.3656,
  zoom: 13,
});
const collectorWidth = resolveThreeOsmRoadWidthWorld({
  tier: "collector",
  centerLat: 42.3656,
  zoom: 13,
});
const localWidth = resolveThreeOsmRoadWidthWorld({
  tier: "local",
  centerLat: 42.3656,
  zoom: 13,
});
const serviceWidth = resolveThreeOsmRoadWidthWorld({
  tier: "service",
  centerLat: 42.3656,
  zoom: 13,
});
assert.ok(motorwayWidth > arterialWidth);
assert.ok(arterialWidth > collectorWidth);
assert.ok(collectorWidth > localWidth);
assert.ok(localWidth > serviceWidth);
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
      motorway: new Float32Array([0, 0.42, 0, 4, 0.42, 0, 0, 0.42, 4]),
      arterial: new Float32Array([0, 0.38, 0, 4, 0.38, 0, 0, 0.38, 4]),
      collector: new Float32Array([0, 0.32, 0, 4, 0.32, 0, 0, 0.32, 4]),
      local: new Float32Array([0, 0.27, 0, 4, 0.27, 0, 0, 0.27, 4]),
      service: new Float32Array([0, 0.22, 0, 4, 0.22, 0, 0, 0.22, 4]),
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
      semanticLodProfile: "detail",
      semanticLodSkippedFeatures: 0,
      roadFeatures: 0,
      roadFeaturesByTier: {
        motorway: 0,
        arterial: 0,
        collector: 0,
        local: 0,
        service: 0,
      },
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
assert.equal(
  (labelScene.group.children[0] as THREE.Mesh<
    THREE.BufferGeometry,
    THREE.MeshBasicMaterial
  >).material.polygonOffset,
  true,
);
assert.deepEqual(
  labelScene.group.children.slice(1, 6).map((child) => child.name),
  [
    "three-osm-vector-road-service",
    "three-osm-vector-road-local",
    "three-osm-vector-road-collector",
    "three-osm-vector-road-arterial",
    "three-osm-vector-road-motorway",
  ],
);
const roadOpacities = labelScene.group.children.slice(1, 6).map(
  (child) =>
    (child as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>).material
      .opacity,
);
assert.deepEqual(roadOpacities, [0.28, 0.34, 0.43, 0.54, 0.64]);
assert.equal(labelScene.labels[0].kind, "vector-place");
assert.deepEqual(labelScene.labels[0].position.toArray(), [12, 2.5, -8]);

console.log("threeOsmVectorContextScene.test.ts ok");
