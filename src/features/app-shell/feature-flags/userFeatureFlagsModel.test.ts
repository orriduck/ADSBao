import assert from "node:assert/strict";

import {
  FEATURE_FLAGS,
  getClerkUserPrimaryEmail,
  isFeatureFlagEnabled,
  isImmersiveThemesEnabled,
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
assert.equal(
  isImmersiveThemesEnabled({ [FEATURE_FLAGS.IMMERSIVE_THEMES_ENABLED]: true }),
  true,
);
assert.equal(
  isImmersiveThemesEnabled({ [FEATURE_FLAGS.FLIGHTAWARE_ENABLED]: true }),
  true,
);
assert.equal(
  isImmersiveThemesEnabled({ [FEATURE_FLAGS.FLIGHTAWARE_ENABLED]: false }),
  false,
);

console.log("userFeatureFlagsModel.test.ts ok");
