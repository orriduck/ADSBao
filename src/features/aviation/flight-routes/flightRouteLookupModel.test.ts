import assert from "node:assert/strict";

import {
  resolvePendingRouteLookups,
  writeRouteCacheEntry,
} from "./flightRouteLookupModel";

const cache = new Map();
const aircraft = [{ callsign: "DAL1576" }, { callsign: "UAL1195" }];

const first = resolvePendingRouteLookups({
  aircraft,
  cache,
  inFlight: new Set(),
  now: 0,
});
assert.deepEqual(first, ["DAL1576"]);

// `useFlightRoutes` advances its candidate version after this cache write.
// The next pass must progress to the next active callsign, not repeat DAL1576.
writeRouteCacheEntry(cache, first[0], null, 0);
const second = resolvePendingRouteLookups({
  aircraft,
  cache,
  inFlight: new Set(),
  now: 0,
});
assert.deepEqual(second, ["UAL1195"]);

writeRouteCacheEntry(cache, second[0], null, 0);
assert.deepEqual(
  resolvePendingRouteLookups({
    aircraft,
    cache,
    inFlight: new Set(),
    now: 0,
  }),
  [],
  "cached candidates must not be looked up again on a later version pass",
);

console.log("flightRouteLookupModel.test.ts ok");
