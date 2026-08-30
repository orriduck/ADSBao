import assert from "node:assert/strict";
import {
  createThreeOsmAircraftGeometry,
  resolveThreeOsmAircraftEmphasis,
  resolveThreeOsmAircraftFamily,
  resolveThreeOsmAircraftPresentation,
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

assert.deepEqual(
  resolveThreeOsmAircraftPresentation({
    sourceZoom: 10,
    emphasis: "standard",
  }),
  { renderFamily: "overview", sizeScale: 1 },
);
assert.deepEqual(
  resolveThreeOsmAircraftPresentation({
    sourceZoom: 11,
    emphasis: "standard",
  }),
  { renderFamily: "overview", sizeScale: 1 },
);
assert.deepEqual(
  resolveThreeOsmAircraftPresentation({
    sourceZoom: 11,
    emphasis: "standard",
    onGround: true,
  }),
  { renderFamily: "overview", sizeScale: 0.72 },
);
assert.deepEqual(
  resolveThreeOsmAircraftPresentation({
    sourceZoom: 12,
    emphasis: "standard",
    onGround: true,
  }),
  { renderFamily: "silhouette", sizeScale: 0.62 },
);
assert.deepEqual(
  resolveThreeOsmAircraftPresentation({
    sourceZoom: 10,
    emphasis: "selected",
  }),
  { renderFamily: "silhouette", sizeScale: 1 },
);

assert.equal(resolveThreeOsmAircraftFamily({ category: "A3" }), "transport");
assert.equal(resolveThreeOsmAircraftFamily({ type: "B77W" }), "heavy");
assert.equal(resolveThreeOsmAircraftFamily({ category: "A1" }), "light");
assert.equal(resolveThreeOsmAircraftFamily({ type: "H60" }), "rotorcraft");
assert.equal(
  resolveThreeOsmAircraftFamily({ category: "A6", type: "F16" }),
  "high-performance",
);
assert.equal(resolveThreeOsmAircraftFamily({ type: "unknown" }), "transport");

const geometry = createThreeOsmAircraftGeometry();
const bounds = geometry.boundingBox;
assert.ok(bounds);
assert.ok(bounds.max.z - bounds.min.z > bounds.max.x - bounds.min.x);
assert.ok(geometry.getAttribute("position").count > 12);
geometry.dispose();

const heavyGeometry = createThreeOsmAircraftGeometry("heavy");
const transportGeometry = createThreeOsmAircraftGeometry("transport");
const rotorcraftGeometry = createThreeOsmAircraftGeometry("rotorcraft");
const overviewGeometry = createThreeOsmAircraftGeometry("overview");
assert.ok(heavyGeometry.boundingBox);
assert.ok(transportGeometry.boundingBox);
assert.ok(rotorcraftGeometry.boundingBox);
assert.ok(overviewGeometry.boundingBox);
assert.ok(
  overviewGeometry.boundingBox.max.z - overviewGeometry.boundingBox.min.z <
    transportGeometry.boundingBox.max.z - transportGeometry.boundingBox.min.z,
);
assert.ok(
  heavyGeometry.boundingBox.max.x - heavyGeometry.boundingBox.min.x >
    transportGeometry.boundingBox.max.x - transportGeometry.boundingBox.min.x,
);
assert.ok(
  rotorcraftGeometry.boundingBox.max.x - rotorcraftGeometry.boundingBox.min.x >
    rotorcraftGeometry.boundingBox.max.z - rotorcraftGeometry.boundingBox.min.z,
);
heavyGeometry.dispose();
transportGeometry.dispose();
rotorcraftGeometry.dispose();
overviewGeometry.dispose();

console.log("threeOsmAircraftVisual.test.ts ok");
