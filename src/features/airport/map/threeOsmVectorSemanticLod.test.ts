import assert from "node:assert/strict";
import {
  isThreeOsmVectorRoadClassVisible,
  isThreeOsmVectorSurfaceKindVisible,
  resolveThreeOsmVectorSemanticLod,
  resolveThreeOsmVectorTileSemanticZoom,
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
assert.equal(
  isThreeOsmVectorSurfaceKindVisible({ kind: "water", lod: overview }),
  false,
);
assert.equal(
  isThreeOsmVectorSurfaceKindVisible({ kind: "aeroway", lod: overview }),
  true,
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
  resolveThreeOsmVectorTileSemanticZoom({ sourceZoom: 12, contextOnly: true }),
  11,
);
assert.equal(
  resolveThreeOsmVectorTileSemanticZoom({ sourceZoom: 14, contextOnly: true }),
  12,
);
assert.equal(
  resolveThreeOsmVectorTileSemanticZoom({ sourceZoom: 14, contextOnly: false }),
  14,
);

console.log("threeOsmVectorSemanticLod.test.ts ok");
