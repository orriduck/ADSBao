import assert from "node:assert/strict";

import {
  isFlightAwareEnabledForUser,
  resolveFeatureFlagsForUser,
} from "./userFeatureFlags.server.js";

{
  const calls = [];
  const flags = await resolveFeatureFlagsForUser({
    user: {
      primaryEmailAddress: { emailAddress: "Owner@Example.COM" },
    },
    repository: {
      async readFlagsByEmail(email) {
        calls.push(email);
        return { flags: { flightAwareEnabled: true } };
      },
    },
  });

  assert.deepEqual(calls, ["owner@example.com"]);
  assert.deepEqual(flags, { flightAwareEnabled: true });
}

{
  const flags = await resolveFeatureFlagsForUser({
    user: {
      primaryEmailAddress: { emailAddress: "owner@example.com" },
      publicMetadata: { flightAwareEnabled: true },
    },
    repository: null,
  });

  assert.deepEqual(flags, {});
}

{
  let called = false;
  const flags = await resolveFeatureFlagsForUser({
    user: null,
    repository: {
      async readFlagsByEmail() {
        called = true;
      },
    },
  });

  assert.deepEqual(flags, {});
  assert.equal(called, false);
}

assert.equal(
  await isFlightAwareEnabledForUser({
    user: {
      primaryEmailAddress: { emailAddress: "owner@example.com" },
    },
    repository: {
      async readFlagsByEmail() {
        return { flags: { flightAwareEnabled: true } };
      },
    },
  }),
  true,
);

console.log("userFeatureFlags.server.test.js ok");
