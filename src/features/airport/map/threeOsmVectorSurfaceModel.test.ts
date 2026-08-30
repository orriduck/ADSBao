import assert from "node:assert/strict";
import { classifyThreeOsmVectorSurface } from "./threeOsmVectorSurfaceModel";

assert.equal(
  classifyThreeOsmVectorSurface({
    layerName: "water",
    className: "ocean",
    geometryType: 3,
  }),
  "water",
);
assert.equal(
  classifyThreeOsmVectorSurface({
    layerName: "landcover",
    className: "wetland",
    geometryType: 3,
  }),
  "natural",
);
assert.equal(
  classifyThreeOsmVectorSurface({
    layerName: "landuse",
    className: "industrial",
    geometryType: 3,
  }),
  "developed",
);
assert.equal(
  classifyThreeOsmVectorSurface({
    layerName: "landuse",
    className: "pitch",
    geometryType: 3,
  }),
  null,
);
assert.equal(
  classifyThreeOsmVectorSurface({
    layerName: "aeroway",
    className: "taxiway",
    geometryType: 2,
  }),
  "aeroway",
);
assert.equal(
  classifyThreeOsmVectorSurface({
    layerName: "aeroway",
    className: "gate",
    geometryType: 1,
  }),
  null,
);

console.log("threeOsmVectorSurfaceModel.test.ts ok");
