import assert from "node:assert/strict";
import { resolveThreeOsmKeyboardSelection } from "./threeOsmKeyboardSelection";

const aircraftIds = ["a1", "b2", "c3"];

assert.equal(
  resolveThreeOsmKeyboardSelection({ key: "ArrowRight", aircraftIds }),
  "a1",
);
assert.equal(
  resolveThreeOsmKeyboardSelection({
    key: "ArrowDown",
    aircraftIds,
    selectedAircraftId: "b2",
  }),
  "c3",
);
assert.equal(
  resolveThreeOsmKeyboardSelection({
    key: "ArrowLeft",
    aircraftIds,
    selectedAircraftId: "a1",
  }),
  "c3",
);
assert.equal(
  resolveThreeOsmKeyboardSelection({ key: "Home", aircraftIds }),
  "a1",
);
assert.equal(
  resolveThreeOsmKeyboardSelection({ key: "End", aircraftIds }),
  "c3",
);
assert.equal(
  resolveThreeOsmKeyboardSelection({ key: "Escape", aircraftIds }),
  "",
);

console.log("threeOsmKeyboardSelection.test.ts ok");
