import assert from "node:assert/strict";
import {
  resolveThreeOsmSceneSemanticLod,
  resolveThreeOsmSceneVectorLabelBudget,
} from "./threeOsmSceneSemanticLod";

const overview = resolveThreeOsmSceneSemanticLod(9);
assert.equal(overview.id, "overview");
assert.equal(overview.sourceZoom, 10);
assert.equal(overview.rasterUnderlayStrength, 0.96);
assert.equal(overview.roadStrength, 0.06);

const approach = resolveThreeOsmSceneSemanticLod(12);
assert.equal(approach.id, "approach");
assert.ok(approach.rasterUnderlayStrength < overview.rasterUnderlayStrength);
assert.ok(approach.roadStrength > overview.roadStrength);

const detail = resolveThreeOsmSceneSemanticLod(15);
assert.equal(detail.id, "detail");
assert.equal(detail.sourceZoom, 14);
assert.equal(detail.rasterUnderlayStrength, 1);
assert.equal(detail.roadStrength, 0.72);

assert.equal(
  resolveThreeOsmSceneVectorLabelBudget({
    sourceZoom: 10,
    compact: true,
    viewMode: "2d",
  }),
  2,
);
assert.equal(
  resolveThreeOsmSceneVectorLabelBudget({
    sourceZoom: 12,
    compact: false,
    viewMode: "3d",
  }),
  9,
);
assert.equal(
  resolveThreeOsmSceneVectorLabelBudget({
    sourceZoom: 14,
    compact: false,
    viewMode: "2d",
  }),
  14,
);

console.log("threeOsmSceneSemanticLod.test.ts ok");
