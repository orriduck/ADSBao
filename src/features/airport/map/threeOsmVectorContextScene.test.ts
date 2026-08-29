import assert from "node:assert/strict";
import {
  classifyThreeOsmRoadTier,
  resolveThreeOsmBuildingHeights,
  resolveThreeOsmRoadWidthWorld,
} from "./threeOsmVectorContextScene";

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

console.log("threeOsmVectorContextScene.test.ts ok");
