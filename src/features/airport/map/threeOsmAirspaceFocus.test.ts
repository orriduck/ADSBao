import assert from "node:assert/strict";
import type {
  ThreeOsmPreparedAirspaceFeature,
  ThreeOsmPreparedAirspaceGeometry,
} from "./threeOsmAirspaceGeometry";
import { resolveThreeOsmAirspaceFocus } from "./threeOsmAirspaceFocus";

function feature({
  id,
  tier,
  altitudeBand,
  distance,
  label,
}: {
  id: string;
  tier: ThreeOsmPreparedAirspaceFeature["tier"];
  altitudeBand: ThreeOsmPreparedAirspaceFeature["altitudeBand"];
  distance: number;
  label: string;
}): ThreeOsmPreparedAirspaceFeature {
  return {
    key: id,
    id,
    label,
    contextLabel: label,
    tier,
    altitudeBand,
    positions: [distance, 2.4, 0, distance + 1, 2.4, 0],
    lowerAltitudeFt: altitudeBand === "surface" ? 0 : 2_000,
    upperAltitudeFt: 7_000,
    lowerY: 2.4,
    cueTopY: 32,
    cueHeightWorld: 29.6,
    distanceFromFocusWorld: distance,
    cueAnchor: { x: distance, y: 2.4, z: 0 },
    labelPosition: { x: distance, y: 36, z: 0 },
  };
}

const featureList = [
  feature({
    id: "control-high",
    tier: "transition-controlled",
    altitudeBand: "high",
    distance: 40,
    label: "CONTROL E · 5.5K–FL600",
  }),
  feature({
    id: "bos-b",
    tier: "terminal-controlled",
    altitudeBand: "surface",
    distance: 110,
    label: "BOSTON B · SFC–7K",
  }),
  feature({
    id: "norwood-d",
    tier: "terminal-controlled",
    altitudeBand: "surface",
    distance: 130,
    label: "NORWOOD D · SFC–2.6K",
  }),
  feature({
    id: "bedford-d",
    tier: "terminal-controlled",
    altitudeBand: "surface",
    distance: 145,
    label: "BEDFORD D · SFC–2.6K",
  }),
  feature({
    id: "bos-shelf",
    tier: "terminal-controlled",
    altitudeBand: "low",
    distance: 155,
    label: "BOSTON B · 2K–7K",
  }),
  feature({
    id: "boston-e5",
    tier: "transition-controlled",
    altitudeBand: "low",
    distance: 170,
    label: "BOSTON E5 · 700 AGL–FL600",
  }),
  feature({
    id: "far-sua",
    tier: "special-use",
    altitudeBand: "surface",
    distance: 400,
    label: "R-4102A · SFC–10K",
  }),
];

const prepared = {
  featureList,
  featuresById: Object.fromEntries(featureList.map((item) => [item.id, item])),
} as ThreeOsmPreparedAirspaceGeometry;

const resolved = resolveThreeOsmAirspaceFocus({
  prepared,
  maxFocusFeatures: 4,
  maxLabels: 2,
});
assert.deepEqual(
  resolved.focusFeatures.map((item) => item.id),
  ["bos-b", "norwood-d", "bedford-d", "bos-shelf"],
);
assert.deepEqual(
  resolved.labelFeatures.map((item) => item.id),
  ["bos-b", "norwood-d"],
);
assert.equal(resolved.focus.features, 4);
assert.equal(resolved.focus.segments, 4);
assert.equal(resolved.context.features, 3);
assert.equal(resolved.context.segments, 3);

const selected = resolveThreeOsmAirspaceFocus({
  prepared,
  selectedAirspaceId: "far-sua",
  maxFocusFeatures: 4,
  maxLabels: 2,
});
assert.equal(selected.focusFeatures[0].id, "far-sua");
assert.equal(selected.focusFeatures.length, 4);
assert.equal(
  selected.labelFeatures.some((item) => item.id === "far-sua"),
  false,
);

const cameraFocused = resolveThreeOsmAirspaceFocus({
  prepared,
  focusX: 400,
  focusZ: 0,
  maxFocusFeatures: 2,
  maxLabels: 1,
});
assert.deepEqual(
  cameraFocused.focusFeatures.map((item) => item.id),
  ["far-sua", "bedford-d"],
);
assert.deepEqual(
  cameraFocused.labelFeatures.map((item) => item.id),
  ["far-sua"],
);

console.log("threeOsmAirspaceFocus.test.ts ok");
