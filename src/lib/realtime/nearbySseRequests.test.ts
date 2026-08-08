import assert from "node:assert/strict";

import {
  buildNearbyCallsignRequest,
  buildNearbyCoordinateRequest,
} from "./nearbySseRequests";

const first = buildNearbyCoordinateRequest({ lat: 42.3651, lon: -71.0091 });
const sameGrid = buildNearbyCoordinateRequest({ lat: 42.3652, lon: -71.0094 });
const nextGrid = buildNearbyCoordinateRequest({ lat: 42.3651, lon: -71.0049 });

assert.equal(first?.channel, "nearby:42.37:-71.01");
assert.equal(
  sameGrid?.channel,
  first?.channel,
  "small here-mode movement stays on the two-decimal channel",
);
assert.notEqual(
  nextGrid?.channel,
  first?.channel,
  "crossing a two-decimal boundary hands off to a new stream",
);
assert.equal(
  buildNearbyCallsignRequest(" dal 1576 ")?.channel,
  "nearby:DAL1576",
);
assert.equal(buildNearbyCoordinateRequest({ lat: 100, lon: 0 }), null);

console.log("nearbySseRequests.test.ts ok");
