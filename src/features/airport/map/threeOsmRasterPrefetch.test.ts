import assert from "node:assert/strict";
import { resolveThreeOsmDirectionalRasterPrefetch } from "./threeOsmRasterPrefetch";

const center = { x: 10.4, y: 20.6, z: 6 };

assert.deepEqual(
  resolveThreeOsmDirectionalRasterPrefetch({
    currentCenter: center,
    candidateCenter: { x: 10.9, y: 20.1, z: 6 },
    radius: 2,
  }),
  [],
);

const east = resolveThreeOsmDirectionalRasterPrefetch({
  currentCenter: center,
  candidateCenter: { x: 11.1, y: 20.6, z: 6 },
  radius: 2,
});
assert.equal(east.length, 5);
assert.deepEqual(new Set(east.map((tile) => tile.x)), new Set([13]));

const northWest = resolveThreeOsmDirectionalRasterPrefetch({
  currentCenter: center,
  candidateCenter: { x: 9.9, y: 19.9, z: 6 },
  radius: 1,
});
assert.equal(northWest.length, 5);
assert.equal(
  northWest.every((tile) => tile.x === 8 || tile.y === 18),
  true,
);

const acrossDateline = resolveThreeOsmDirectionalRasterPrefetch({
  currentCenter: { x: 63.8, y: 20.6, z: 6 },
  candidateCenter: { x: 0.1, y: 20.6, z: 6 },
  radius: 1,
});
assert.equal(acrossDateline.length, 3);
assert.deepEqual(new Set(acrossDateline.map((tile) => tile.x)), new Set([1]));

assert.deepEqual(
  resolveThreeOsmDirectionalRasterPrefetch({
    currentCenter: center,
    candidateCenter: { x: 13.1, y: 20.6, z: 6 },
    radius: 2,
  }),
  [],
);

assert.deepEqual(
  resolveThreeOsmDirectionalRasterPrefetch({
    currentCenter: center,
    candidateCenter: { x: 20.1, y: 30.1, z: 7 },
    radius: 2,
  }),
  [],
);

console.log("threeOsmRasterPrefetch.test.ts ok");
