import assert from "node:assert/strict";
import {
  resolveThreeOsmCameraScale,
  resolveThreeOsmContinuousLod,
  resolveThreeOsmLodBounds,
  resolveThreeOsmSettledLod,
  resolveThreeOsmSourceTileTransform,
} from "./threeOsmCameraLod";
import { lonLatToTileCoordinate } from "./threeOsmProjection";

assert.equal(
  resolveThreeOsmCameraScale({ mode: "2d", orthographicZoom: 2 }),
  2,
);
assert.equal(
  resolveThreeOsmCameraScale({ mode: "3d", distance: 400 }),
  1 / 400,
);
assert.equal(
  resolveThreeOsmContinuousLod({
    sceneZoom: 12,
    referenceScale: 1,
    currentScale: 4,
  }),
  14,
);

assert.equal(
  resolveThreeOsmSettledLod({
    continuousZoom: 12.64,
    currentZoom: 12,
    minZoom: 10,
    maxZoom: 14,
  }),
  12,
);
assert.equal(
  resolveThreeOsmSettledLod({
    continuousZoom: 12.66,
    currentZoom: 12,
    minZoom: 10,
    maxZoom: 14,
  }),
  13,
);
assert.equal(
  resolveThreeOsmSettledLod({
    continuousZoom: 12.36,
    currentZoom: 13,
    minZoom: 10,
    maxZoom: 14,
  }),
  13,
);
assert.equal(
  resolveThreeOsmSettledLod({
    continuousZoom: 12.34,
    currentZoom: 13,
    minZoom: 10,
    maxZoom: 14,
  }),
  12,
);
assert.equal(
  resolveThreeOsmSettledLod({
    continuousZoom: 14,
    currentZoom: 12,
    minZoom: 10,
    maxZoom: 14,
  }),
  14,
);
assert.deepEqual(resolveThreeOsmLodBounds(12), { minZoom: 10, maxZoom: 14 });
assert.deepEqual(resolveThreeOsmLodBounds(9), { minZoom: 9, maxZoom: 9 });

const sceneCenter = lonLatToTileCoordinate(-71.0064, 42.3629, 12);
const sourceCenter13 = lonLatToTileCoordinate(-71.0064, 42.3629, 13);
const sourceCenter11 = lonLatToTileCoordinate(-71.0064, 42.3629, 11);
const source13 = resolveThreeOsmSourceTileTransform({
  tile: {
    x: Math.floor(sourceCenter13.x),
    y: Math.floor(sourceCenter13.y),
    z: 13,
  },
  sourceCenter: sourceCenter13,
  sceneZoom: sceneCenter.z,
});
const source11 = resolveThreeOsmSourceTileTransform({
  tile: {
    x: Math.floor(sourceCenter11.x),
    y: Math.floor(sourceCenter11.y),
    z: 11,
  },
  sourceCenter: sourceCenter11,
  sceneZoom: sceneCenter.z,
});
assert.equal(source13.worldSize, 128);
assert.equal(source11.worldSize, 512);
assert.ok(Math.abs(source13.x) <= source13.worldSize / 2);
assert.ok(Math.abs(source13.z) <= source13.worldSize / 2);

console.log("threeOsmCameraLod.test.ts ok");
