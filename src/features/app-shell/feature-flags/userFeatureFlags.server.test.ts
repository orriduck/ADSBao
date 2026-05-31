import assert from "node:assert/strict";

import {
  isFlightAwareEnabledForUser,
  resolveFeatureFlagsForUser,
} from "./userFeatureFlags.server";

{
  const calls = [];
  const flags = await resolveFeatureFlagsForUser({
    user: {
      primaryEmailAddress: { emailAddress: "Owner@Example.COM" },
    },
    repository: {
      async readFlagsByEmail(email, options) {
        calls.push({ email, environment: options.environment });
        return { flags: { flightAwareEnabled: true } };
      },
    },
    env: { VERCEL_ENV: "preview" },
  });

  assert.deepEqual(calls, [{ email: "owner@example.com", environment: "preview" }]);
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

console.log("userFeatureFlags.server.test.ts ok");
