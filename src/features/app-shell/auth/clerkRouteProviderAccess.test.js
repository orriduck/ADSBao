import assert from "node:assert/strict";

import {
  buildClerkUserAccessEntity,
  isFlightAwareOwnerEntity,
} from "./clerkRouteProviderAccess.js";

assert.equal(buildClerkUserAccessEntity(null), undefined);
assert.equal(buildClerkUserAccessEntity({}), undefined);

assert.deepEqual(
  buildClerkUserAccessEntity({
    id: "user_owner",
    publicMetadata: { flightAwareEnabled: true },
  }),
  { id: "user_owner", flightAwareEnabled: true },
);

assert.deepEqual(
  buildClerkUserAccessEntity({
    id: "user_other",
    publicMetadata: { flightAwareEnabled: false },
  }),
  { id: "user_other", flightAwareEnabled: false },
);

assert.deepEqual(
  buildClerkUserAccessEntity({ id: "user_blank" }),
  { id: "user_blank", flightAwareEnabled: false },
);

// Only strict `=== true` unlocks the flag — string "true" or 1 stays off.
assert.equal(
  buildClerkUserAccessEntity({
    id: "u",
    publicMetadata: { flightAwareEnabled: "true" },
  }).flightAwareEnabled,
  false,
);
assert.equal(
  buildClerkUserAccessEntity({
    id: "u",
    publicMetadata: { flightAwareEnabled: 1 },
  }).flightAwareEnabled,
  false,
);

assert.equal(isFlightAwareOwnerEntity({ flightAwareEnabled: true }), true);
assert.equal(isFlightAwareOwnerEntity({ flightAwareEnabled: false }), false);
assert.equal(isFlightAwareOwnerEntity({}), false);
assert.equal(isFlightAwareOwnerEntity(undefined), false);
