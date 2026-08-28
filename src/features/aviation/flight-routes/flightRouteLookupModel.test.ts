import assert from "node:assert/strict";

import {
  filterRouteLookupStatuses,
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
assert.deepEqual(
  first,
  ["DAL1576", "UAL1195"],
  "one route candidate must not prevent another explicit candidate from starting",
);

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

assert.deepEqual(
  resolvePendingRouteLookups({
    aircraft: [
      {
        callsign: "PAIDMETA",
        origin: "KJFK",
        destination: "KLAX",
      },
      { callsign: "UAL1195" },
    ],
    cache: new Map(),
    inFlight: new Set(),
    now: 0,
  }),
  ["UAL1195"],
  "valid aircraft route metadata must not trigger a duplicate HTTP lookup",
);

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

assert.deepEqual(
  filterRouteLookupStatuses(
    { DAL1576: "pending", UAL1195: "retrying" },
    [{ callsign: "UAL1195" }],
  ),
  { UAL1195: "retrying" },
  "switching candidates must not retain an old loading status",
);

console.log("flightRouteLookupModel.test.ts ok");
