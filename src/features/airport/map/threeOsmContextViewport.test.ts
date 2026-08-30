import assert from "node:assert/strict";

import { resolveThreeOsmContextViewport } from "./threeOsmContextViewport";
import { lonLatToTileCoordinate } from "./threeOsmProjection";

const kbostonZ14 = lonLatToTileCoordinate(-71.0064, 42.3629, 14);
const overview = resolveThreeOsmContextViewport({
  sourceCenter: kbostonZ14,
  radius: 2,
});

assert.equal(overview.zoom, 10);
assert.equal(overview.radius, 2);
assert.equal(overview.tileCount, 25);
assert.match(overview.signature, /^10\/\d+\/\d+\/2$/);
assert.equal(
  overview.requestPath,
  `/api/airspace/window/${overview.signature}`,
);
assert.ok(overview.bounds.west < -71.0064);
assert.ok(overview.bounds.east > -71.0064);
assert.ok(overview.bounds.south < 42.3629);
assert.ok(overview.bounds.north > 42.3629);

const sameContextTile = resolveThreeOsmContextViewport({
  sourceCenter: { ...kbostonZ14, x: kbostonZ14.x + 1 },
  radius: 2,
});
assert.equal(sameContextTile.signature, overview.signature);

const nextContextTile = resolveThreeOsmContextViewport({
  sourceCenter: { ...kbostonZ14, x: kbostonZ14.x + 64 },
  radius: 2,
});
assert.notEqual(nextContextTile.signature, overview.signature);

const dateline = resolveThreeOsmContextViewport({
  sourceCenter: { x: -0.25, y: 512, z: 10 },
});
assert.equal(dateline.tileCount, 25);
assert.match(dateline.signature, /^10\/1023\/512\/2$/);

console.log("threeOsmContextViewport.test.ts ok");
