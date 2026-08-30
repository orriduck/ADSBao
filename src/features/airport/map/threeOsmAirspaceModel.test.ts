import assert from "node:assert/strict";
import {
  resolveThreeOsmAirspaceAltitudeBand,
  resolveThreeOsmAirspaceLowerAltitudeFt,
  resolveThreeOsmAirspaceTier,
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

console.log("threeOsmAirspaceModel.test.ts ok");
