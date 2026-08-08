import assert from "node:assert/strict";

import { resolveFlightRouteCandidateCallsigns } from "./flightTrackingDisplayModel";

assert.deepEqual(
  resolveFlightRouteCandidateCallsigns({
    focalCallsign: "cns308",
    selectedCallsign: "n580mm",
  }),
  ["CNS308", "N580MM"],
  "the focal route stays active while a secondary preview is selected",
);
assert.deepEqual(
  resolveFlightRouteCandidateCallsigns({
    focalCallsign: "CNS308",
    selectedCallsign: "cns308",
  }),
  ["CNS308"],
);

console.log("flightTrackingDisplayModel.test.ts ok");
