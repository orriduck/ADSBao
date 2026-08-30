import assert from "node:assert/strict";
import {
  isThreeOsmVectorRoadClassVisible,
  isThreeOsmVectorSurfaceKindVisible,
  resolveThreeOsmVectorSemanticLod,
  resolveThreeOsmVectorTileRadius,
} from "./threeOsmVectorSemanticLod";

const overview = resolveThreeOsmVectorSemanticLod(10);
assert.equal(overview.id, "overview");
assert.equal(overview.maxLabels, 28);
assert.equal(overview.showBuildings, false);
assert.equal(
  isThreeOsmVectorRoadClassVisible({ className: "primary", lod: overview }),
  true,
);
assert.equal(
  isThreeOsmVectorRoadClassVisible({ className: "secondary", lod: overview }),
  false,
);
assert.equal(
  isThreeOsmVectorSurfaceKindVisible({ kind: "natural", lod: overview }),
  false,
);

const regional = resolveThreeOsmVectorSemanticLod(11);
assert.equal(regional.id, "regional");
assert.equal(
  isThreeOsmVectorRoadClassVisible({ className: "secondary", lod: regional }),
  true,
);
assert.equal(
  isThreeOsmVectorRoadClassVisible({ className: "tertiary", lod: regional }),
  false,
);
assert.equal(
  isThreeOsmVectorSurfaceKindVisible({ kind: "natural", lod: regional }),
  true,
);
assert.equal(
  isThreeOsmVectorSurfaceKindVisible({ kind: "developed", lod: regional }),
  false,
);

const approach = resolveThreeOsmVectorSemanticLod(12);
assert.equal(approach.id, "approach");
assert.equal(approach.maxLabels, 42);
assert.equal(
  isThreeOsmVectorRoadClassVisible({ className: "tertiary", lod: approach }),
  true,
);
assert.equal(
  isThreeOsmVectorRoadClassVisible({ className: "minor", lod: approach }),
  false,
);
assert.equal(
  isThreeOsmVectorSurfaceKindVisible({ kind: "developed", lod: approach }),
  true,
);

const detail = resolveThreeOsmVectorSemanticLod(13);
assert.equal(detail.id, "detail");
assert.equal(detail.showBuildings, true);
assert.equal(detail.maxLabels, 48);
assert.equal(
  isThreeOsmVectorRoadClassVisible({ className: "service", lod: detail }),
  true,
);

assert.equal(
  resolveThreeOsmVectorTileRadius({ sourceZoom: 10, rasterTileRadius: 2 }),
  2,
);
assert.equal(
  resolveThreeOsmVectorTileRadius({ sourceZoom: 11, rasterTileRadius: 2 }),
  2,
);
assert.equal(
  resolveThreeOsmVectorTileRadius({ sourceZoom: 10, rasterTileRadius: 1 }),
  1,
);
assert.equal(
  resolveThreeOsmVectorTileRadius({ sourceZoom: 12, rasterTileRadius: 2 }),
  1,
);

console.log("threeOsmVectorSemanticLod.test.ts ok");
