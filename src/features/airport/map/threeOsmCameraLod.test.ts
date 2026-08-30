import assert from "node:assert/strict";
import {
  buildThreeOsmParentRasterFallbackTiles,
  resolveThreeOsmCameraScale,
  resolveThreeOsmContinuousLod,
  resolveThreeOsmLodBounds,
  resolveThreeOsmSettledLod,
  resolveThreeOsmSourceTileTransform,
  resolveThreeOsmSourceViewCenter,
  resolveThreeOsmTileWindowKey,
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
  projectionCenter: sourceCenter13,
  sceneZoom: sceneCenter.z,
});
const source11 = resolveThreeOsmSourceTileTransform({
  tile: {
    x: Math.floor(sourceCenter11.x),
    y: Math.floor(sourceCenter11.y),
    z: 11,
  },
  projectionCenter: sourceCenter11,
  sceneZoom: sceneCenter.z,
});
assert.equal(source13.worldSize, 128);
assert.equal(source11.worldSize, 512);
assert.ok(Math.abs(source13.x) <= source13.worldSize / 2);
assert.ok(Math.abs(source13.z) <= source13.worldSize / 2);

const parentSource12 = resolveThreeOsmSourceTileTransform({
  tile: {
    x: Math.floor(sourceCenter13.x / 2),
    y: Math.floor(sourceCenter13.y / 2),
    z: 12,
  },
  projectionCenter: sourceCenter13,
  sceneZoom: sceneCenter.z,
});
assert.equal(parentSource12.worldSize, 256);
assert.ok(Math.abs(parentSource12.x) <= parentSource12.worldSize / 2);
assert.ok(Math.abs(parentSource12.z) <= parentSource12.worldSize / 2);

const parentFallbackTiles = buildThreeOsmParentRasterFallbackTiles({
  center: sourceCenter13,
  fineRadius: 2,
});
assert.ok(parentFallbackTiles.length > 0);
assert.ok(parentFallbackTiles.length < 16);
assert.ok(parentFallbackTiles.every((tile) => tile.z === 12));
assert.equal(
  new Set(parentFallbackTiles.map((tile) => `${tile.z}/${tile.x}/${tile.y}`))
    .size,
  parentFallbackTiles.length,
);

const pannedSourceCenter = resolveThreeOsmSourceViewCenter({
  projectionCenter: sourceCenter13,
  sceneZoom: sceneCenter.z,
  targetX: 128,
  targetZ: -64,
});
assert.ok(Math.abs(pannedSourceCenter.x - sourceCenter13.x - 1) < 0.0001);
assert.ok(Math.abs(pannedSourceCenter.y - sourceCenter13.y + 0.5) < 0.0001);
assert.notEqual(
  resolveThreeOsmTileWindowKey(pannedSourceCenter),
  resolveThreeOsmTileWindowKey(sourceCenter13),
);

const pannedTile = resolveThreeOsmSourceTileTransform({
  tile: {
    x: Math.floor(pannedSourceCenter.x),
    y: Math.floor(pannedSourceCenter.y),
    z: 13,
  },
  projectionCenter: sourceCenter13,
  sceneZoom: sceneCenter.z,
});
assert.ok(pannedTile.x > source13.x);
assert.ok(Number.isFinite(pannedTile.z));

const invalidTargetCenter = resolveThreeOsmSourceViewCenter({
  projectionCenter: sourceCenter13,
  sceneZoom: sceneCenter.z,
  targetX: Number.POSITIVE_INFINITY,
  targetZ: Number.NaN,
});
assert.ok(Math.abs(invalidTargetCenter.x - sourceCenter13.x) < 0.0001);
assert.ok(Math.abs(invalidTargetCenter.y - sourceCenter13.y) < 0.0001);
assert.equal(invalidTargetCenter.z, sourceCenter13.z);

console.log("threeOsmCameraLod.test.ts ok");
