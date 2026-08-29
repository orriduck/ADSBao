import assert from "node:assert/strict";
import {
  createThreeOsmAircraftGeometry,
  resolveThreeOsmAircraftEmphasis,
  resolveThreeOsmAircraftScale,
} from "./threeOsmAircraftVisual";

assert.equal(
  resolveThreeOsmAircraftEmphasis({
    id: "primary",
    selectedAircraftId: "primary",
    focalAircraftId: "primary",
  }),
  "focal",
);
assert.equal(
  resolveThreeOsmAircraftEmphasis({
    id: "secondary",
    selectedAircraftId: "secondary",
    focalAircraftId: "primary",
  }),
  "selected",
);
assert.equal(
  resolveThreeOsmAircraftEmphasis({
    id: "traffic",
    selectedAircraftId: "secondary",
    focalAircraftId: "primary",
  }),
  "standard",
);

assert.equal(resolveThreeOsmAircraftScale("standard"), 1);
assert.ok(resolveThreeOsmAircraftScale("selected") > 1);
assert.ok(
  resolveThreeOsmAircraftScale("focal") >
    resolveThreeOsmAircraftScale("selected"),
);

const geometry = createThreeOsmAircraftGeometry();
const bounds = geometry.boundingBox;
assert.ok(bounds);
assert.ok(bounds.max.z - bounds.min.z > bounds.max.x - bounds.min.x);
assert.ok(geometry.getAttribute("position").count > 12);
geometry.dispose();

console.log("threeOsmAircraftVisual.test.ts ok");
