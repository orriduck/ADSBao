import assert from "node:assert/strict";

import {
  hasAircraftPayload,
  hasNearbyAircraftPayload,
  hasNearbyFocusPayload,
  hasNearbyStreamPayload,
  readNearbyAirportsUpdate,
} from "./nearbySsePayloadModel";

const pending = { anchor: { lat: 42.36, lon: -71.01 } };
assert.equal(hasNearbyStreamPayload(pending), false, "anchor-only snapshot is pending");
assert.equal(hasNearbyAircraftPayload({ aircraft: { ac: [] } }), true);
assert.equal(hasAircraftPayload({ ac: [] }), true, "an explicit empty traffic result is valid");
assert.equal(hasNearbyFocusPayload({ focus: { ac: [] } }), false);
assert.equal(hasNearbyFocusPayload({ focus: { state: "pending" } }), false);
assert.equal(hasNearbyFocusPayload({ focus: { callsign: "DAL1576" } }), true);
assert.equal(
  hasNearbyStreamPayload({ focus: { callsign: "DAL1576" } }),
  true,
);
assert.equal(readNearbyAirportsUpdate(pending), undefined, "omission preserves cached airports");
assert.deepEqual(readNearbyAirportsUpdate({ nearbyAirports: [] }), []);

console.log("nearbySsePayloadModel.test.ts ok");
