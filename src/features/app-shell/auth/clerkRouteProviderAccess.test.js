import assert from "node:assert/strict";

import {
  buildClerkUserAccessEntity,
  isFlightAwareOwnerEntity,
} from "./clerkRouteProviderAccess.js";

assert.equal(buildClerkUserAccessEntity(null), undefined);
assert.deepEqual(
  buildClerkUserAccessEntity({
    id: "user_123",
    primaryEmailAddress: { emailAddress: "owner@example.com" },
    fullName: "Owner Pilot",
  }),
  {
    id: "user_123",
    email: "owner@example.com",
    name: "Owner Pilot",
  },
);
assert.deepEqual(
  buildClerkUserAccessEntity({
    id: "user_456",
    emailAddresses: [{ emailAddress: "fallback@example.com" }],
  }),
  {
    id: "user_456",
    email: "fallback@example.com",
    name: "",
  },
);
assert.deepEqual(
  buildClerkUserAccessEntity({
    id: "user_owner",
    primaryEmailAddress: { emailAddress: " Ruyyi0323@Gmail.com " },
  }),
  {
    id: "user_owner",
    email: "ruyyi0323@gmail.com",
    name: "",
  },
);
assert.equal(
  isFlightAwareOwnerEntity({ email: "ruyyi0323@gmail.com" }),
  true,
);
assert.equal(
  isFlightAwareOwnerEntity({ email: "owner@example.com" }),
  false,
);
