import assert from "node:assert/strict";

import {
  getAircraftIdentity,
  getAircraftContextGroup,
  getContextTagLabel,
  resolveAircraftContextEmphasis,
} from "./airportContextUiModel";

assert.equal(getAircraftIdentity({ icao24: "abc123" }), "abc123");
assert.equal(getAircraftIdentity({ callsign: "DAL4" }), "DAL4");
assert.equal(getAircraftIdentity({ icao24: "abc", callsign: "DAL4" }), "abc");
assert.equal(getAircraftIdentity({}), "");

assert.equal(
  getAircraftContextGroup({
    airportContext: { display: { group: "Terminal Flow" } },
  }),
  "Terminal Flow",
);
assert.equal(getAircraftContextGroup({}), "Unknown");

assert.equal(
  getContextTagLabel({
    airportContext: { airspace: { matched: true, label: "70/20" } },
  }),
  "70/20",
);
assert.equal(
  getContextTagLabel({ airportContext: { altitudeBand: "class-a" } }),
  "Class A",
);
assert.equal(getContextTagLabel({}), "Context");

assert.deepEqual(resolveAircraftContextEmphasis({ matchesFilters: true }), {
  opacity: 1,
  showLabel: true,
});
assert.deepEqual(resolveAircraftContextEmphasis({ matchesFilters: false }), {
  opacity: 0.55,
  showLabel: false,
});
assert.deepEqual(
  resolveAircraftContextEmphasis({ matchesFilters: false, selected: true }),
  { opacity: 1, showLabel: true },
);

console.log("airportContextUiModel.test.ts: ok");
