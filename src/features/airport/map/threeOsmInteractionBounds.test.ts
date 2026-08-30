import assert from "node:assert/strict";
import {
  clampThreeOsmCameraTarget,
  resolveThreeOsmMinimumOrthoZoom,
  resolveThreeOsmTileWorldBounds,
  resolveThreeOsmVisibleHorizontalFraction,
} from "./threeOsmInteractionBounds";
import {
  buildVisibleTileGrid,
  lonLatToTileCoordinate,
} from "./threeOsmProjection";

const center = lonLatToTileCoordinate(-71.0064, 42.3629, 10);
const bounds = resolveThreeOsmTileWorldBounds({
  tiles: buildVisibleTileGrid(center, 2),
  center,
});
assert.ok(bounds);
assert.equal(Math.round(bounds.maxX - bounds.minX), 1_280);
assert.equal(Math.round(bounds.maxZ - bounds.minZ), 1_280);

const clamped = clampThreeOsmCameraTarget({
  target: { x: 900, z: -900 },
  bounds,
  footprint: { minX: -400, maxX: 400, minZ: -300, maxZ: 300 },
});
assert.equal(clamped.clamped, true);
assert.ok(clamped.x <= bounds.maxX - 400 - 12);
assert.ok(clamped.z >= bounds.minZ + 300 + 12);

const unchanged = clampThreeOsmCameraTarget({
  target: { x: 0, z: 0 },
  bounds,
  footprint: { minX: -200, maxX: 200, minZ: -180, maxZ: 180 },
});
assert.equal(unchanged.clamped, false);

assert.ok(
  resolveThreeOsmMinimumOrthoZoom({
    cameraWidth: 800,
    cameraHeight: 600,
    bounds,
  }) > 0.6,
);

assert.equal(
  resolveThreeOsmVisibleHorizontalFraction({
    viewportWidth: 1440,
    occlusionWidth: 300,
  }),
  1140 / 1440,
);

console.log("threeOsmInteractionBounds.test.ts ok");
