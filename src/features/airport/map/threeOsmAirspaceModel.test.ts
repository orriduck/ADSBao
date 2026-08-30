import assert from "node:assert/strict";
import {
  resolveThreeOsmAirspaceAltitudeBand,
  resolveThreeOsmAirspaceCueHeightWorld,
  resolveThreeOsmAirspaceLowerAltitudeFt,
  resolveThreeOsmAirspaceSimplificationTolerance,
  resolveThreeOsmAirspaceTier,
  resolveThreeOsmAirspaceUpperAltitudeFt,
  simplifyThreeOsmAirspaceRing,
} from "./threeOsmAirspaceModel";

assert.equal(
  resolveThreeOsmAirspaceTier({ accessLevel: "restricted", classLabel: "E" }),
  "special-use",
);
assert.equal(
  resolveThreeOsmAirspaceTier({ accessLevel: "controlled", classLabel: "B" }),
  "terminal-controlled",
);
assert.equal(
  resolveThreeOsmAirspaceTier({ accessLevel: "controlled", classLabel: "D" }),
  "terminal-controlled",
);
assert.equal(
  resolveThreeOsmAirspaceTier({ accessLevel: "controlled", classLabel: "E" }),
  "transition-controlled",
);
assert.equal(
  resolveThreeOsmAirspaceTier({ accessLevel: "controlled", classLabel: "A" }),
  "upper-controlled",
);
assert.equal(
  resolveThreeOsmAirspaceTier({ accessLevel: "informational", classLabel: "" }),
  "advisory",
);

assert.equal(
  resolveThreeOsmAirspaceLowerAltitudeFt({
    lowerLimit: { value: 700, unit: 1, referenceDatum: 0 },
  }),
  700,
);
assert.equal(
  Math.round(
    resolveThreeOsmAirspaceLowerAltitudeFt({
      lowerLimit: { value: 1_000, unit: 0, referenceDatum: 1 },
    }),
  ),
  3_281,
);
assert.equal(
  resolveThreeOsmAirspaceLowerAltitudeFt({ lowerLimitLabel: "FL 85" }),
  8_500,
);
assert.equal(
  resolveThreeOsmAirspaceLowerAltitudeFt({ lowerLimitLabel: "SFC" }),
  0,
);
assert.equal(resolveThreeOsmAirspaceAltitudeBand(0), "surface");
assert.equal(resolveThreeOsmAirspaceAltitudeBand(2_000), "low");
assert.equal(resolveThreeOsmAirspaceAltitudeBand(3_000), "high");

assert.equal(
  resolveThreeOsmAirspaceUpperAltitudeFt({
    upperLimit: { value: 7_000, unit: 1 },
  }),
  7_000,
);
assert.equal(
  resolveThreeOsmAirspaceUpperAltitudeFt({ upperLimitLabel: "FL 85" }),
  8_500,
);
assert.equal(resolveThreeOsmAirspaceUpperAltitudeFt({}), null);
assert.equal(resolveThreeOsmAirspaceCueHeightWorld(0, 500), 22);
assert.equal(resolveThreeOsmAirspaceCueHeightWorld(2_000, 2_000), 0);
assert.equal(resolveThreeOsmAirspaceCueHeightWorld(0, 60_000), 64);

assert.equal(resolveThreeOsmAirspaceSimplificationTolerance(10), 0.75);
assert.equal(resolveThreeOsmAirspaceSimplificationTolerance(12), 0.35);
assert.equal(resolveThreeOsmAirspaceSimplificationTolerance(14), 0.1);

const closedRing = [
  { x: 0, z: 0 },
  { x: 1, z: 0.02 },
  { x: 2, z: 0 },
  { x: 2, z: 1 },
  { x: 2, z: 2 },
  { x: 1, z: 1.98 },
  { x: 0, z: 2 },
  { x: 0, z: 1 },
  { x: 0, z: 0 },
];
const simplifiedRing = simplifyThreeOsmAirspaceRing(closedRing, 0.1);
assert.ok(simplifiedRing.length < closedRing.length);
assert.deepEqual(simplifiedRing[0], simplifiedRing[simplifiedRing.length - 1]);
assert.ok(simplifiedRing.length >= 4);

assert.deepEqual(
  simplifyThreeOsmAirspaceRing(closedRing, 0),
  closedRing,
  "zero tolerance keeps every source point",
);

console.log("threeOsmAirspaceModel.test.ts ok");
