import assert from "node:assert/strict";
import {
  buildThreeOsmTileWindowGrid,
  constrainThreeOsmTileWindow,
  resolveThreeOsmViewportTileWindow,
} from "./threeOsmTileWindow";

const portraitCenter = { x: 309.63, y: 378.44, z: 10 };
const portrait = resolveThreeOsmViewportTileWindow({
  center: portraitCenter,
  sceneZoom: 10,
  sourceZoom: 10,
  footprint: { minX: -266, maxX: 266, minZ: -576, maxZ: 576 },
});
assert.ok(portrait.rows > portrait.columns);
assert.ok(portrait.tileCount <= 49);
assert.equal(buildThreeOsmTileWindowGrid({ center: portraitCenter, window: portrait }).length, portrait.tileCount);

const landscape = resolveThreeOsmViewportTileWindow({
  center: portraitCenter,
  sceneZoom: 10,
  sourceZoom: 10,
  footprint: { minX: -576, maxX: 576, minZ: -455, maxZ: 455 },
});
assert.ok(landscape.columns > landscape.rows);
assert.ok(landscape.tileCount <= 49);

const detailed = resolveThreeOsmViewportTileWindow({
  center: { ...portraitCenter, z: 13 },
  sceneZoom: 10,
  sourceZoom: 13,
  footprint: { minX: -576, maxX: 576, minZ: -455, maxZ: 455 },
});
assert.equal(detailed.columns, 7);
assert.equal(detailed.rows, 7);

const constrained = constrainThreeOsmTileWindow(landscape, 1);
assert.ok(constrained.columns <= 3);
assert.ok(constrained.rows <= 3);

const datelineTiles = buildThreeOsmTileWindowGrid({
  center: { x: 63.8, y: 20.6, z: 6 },
  window: landscape,
});
assert.equal(new Set(datelineTiles.map((tile) => tile.x)).size, landscape.columns);
assert.ok(datelineTiles.some((tile) => tile.x === 0));

console.log("threeOsmTileWindow.test.ts ok");
