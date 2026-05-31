import assert from "node:assert/strict";

import {
  FEATURE_FLAGS,
  buildUserFeatureFlagAccessEntity,
  getClerkUserPrimaryEmail,
  isFeatureFlagEnabled,
  normalizeFeatureFlags,
  normalizeFeatureFlagEnvironment,
  normalizeUserEmail,
  resolveFeatureFlagEnvironment,
} from "./userFeatureFlagsModel";

assert.equal(normalizeUserEmail(" OWNER@Example.COM "), "owner@example.com");
assert.equal(normalizeUserEmail(""), "");
assert.equal(normalizeUserEmail(null), "");
assert.equal(normalizeFeatureFlagEnvironment("preview"), "preview");
assert.equal(normalizeFeatureFlagEnvironment("development"), "local");
assert.equal(normalizeFeatureFlagEnvironment(""), "local");
assert.throws(
  () => normalizeFeatureFlagEnvironment("staging"),
  /Expected feature flag environment/,
);
assert.equal(
  resolveFeatureFlagEnvironment({ FEATURE_FLAGS_ENV: "preview" }),
  "preview",
);
assert.equal(
  resolveFeatureFlagEnvironment({ VERCEL_ENV: "production" }),
  "production",
);
assert.equal(resolveFeatureFlagEnvironment({}), "local");

assert.equal(
  getClerkUserPrimaryEmail({
    primaryEmailAddress: { emailAddress: "Owner@Example.COM" },
  }),
  "owner@example.com",
);

assert.deepEqual(
  normalizeFeatureFlags({
    flightAwareEnabled: true,
    otherExperimentalFlag: "true",
  }),
  { flightAwareEnabled: true, otherExperimentalFlag: false },
);

assert.equal(
  isFeatureFlagEnabled({ [FEATURE_FLAGS.FLIGHTAWARE_ENABLED]: true }, FEATURE_FLAGS.FLIGHTAWARE_ENABLED),
  true,
);
assert.equal(
  isFeatureFlagEnabled({ [FEATURE_FLAGS.FLIGHTAWARE_ENABLED]: "true" }, FEATURE_FLAGS.FLIGHTAWARE_ENABLED),
  false,
);

assert.deepEqual(
  buildUserFeatureFlagAccessEntity({
    user: {
      id: "user_owner",
      primaryEmailAddress: { emailAddress: "Owner@Example.COM" },
      publicMetadata: { flightAwareEnabled: true },
    },
    flags: {},
  }),
  {
    id: "user_owner",
    email: "owner@example.com",
    flags: {},
    flightAwareEnabled: false,
  },
);

assert.equal(
  buildUserFeatureFlagAccessEntity({
    user: {
      id: "user_owner",
      primaryEmailAddress: { emailAddress: "owner@example.com" },
    },
    flags: { flightAwareEnabled: true },
  }).flightAwareEnabled,
  true,
);

assert.equal(buildUserFeatureFlagAccessEntity({ user: null }), undefined);

console.log("userFeatureFlagsModel.test.ts ok");
