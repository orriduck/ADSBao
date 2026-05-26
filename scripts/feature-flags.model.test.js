import assert from "node:assert/strict";

import {
  applyFeatureFlagCommand,
  parseFeatureFlagCommand,
} from "./feature-flags.model.js";

assert.deepEqual(
  parseFeatureFlagCommand(["--env", "preview", "set", " Owner@Example.COM ", "flightAwareEnabled", "on"]),
  {
    action: "set",
    email: "owner@example.com",
    environment: "preview",
    flagKey: "flightAwareEnabled",
    flagValue: true,
  },
);

assert.deepEqual(
  parseFeatureFlagCommand(["set", "owner@example.com", "flightAwareEnabled", "off"]),
  {
    action: "set",
    email: "owner@example.com",
    environment: "local",
    flagKey: "flightAwareEnabled",
    flagValue: false,
  },
);

assert.deepEqual(
  parseFeatureFlagCommand(["merge", "--env=production", "owner@example.com", '{"flightAwareEnabled":true,"other":"true"}']),
  {
    action: "merge",
    email: "owner@example.com",
    environment: "production",
    flags: {
      flightAwareEnabled: true,
      other: false,
    },
  },
);

assert.deepEqual(
  parseFeatureFlagCommand(["clear", "owner@example.com", "flightAwareEnabled"]),
  {
    action: "clear-flag",
    email: "owner@example.com",
    environment: "local",
    flagKey: "flightAwareEnabled",
  },
);

assert.deepEqual(
  parseFeatureFlagCommand(["clear", "owner@example.com"]),
  {
    action: "clear-user",
    email: "owner@example.com",
    environment: "local",
  },
);

assert.throws(
  () => parseFeatureFlagCommand(["--env", "staging", "get", "owner@example.com"]),
  /Expected feature flag environment/,
);

assert.throws(
  () => parseFeatureFlagCommand(["set", "owner@example.com", "flightAwareEnabled", "maybe"]),
  /Expected boolean value/,
);

{
  const calls = [];
  const result = await applyFeatureFlagCommand({
    command: parseFeatureFlagCommand(["set", "owner@example.com", "flightAwareEnabled", "on"]),
    repository: {
      async readFlagsByEmail(email, options) {
        calls.push(["read", email, options]);
        return { flags: { existingFlag: true } };
      },
      async upsertFlagsByEmail({ email, environment, flags }) {
        calls.push(["upsert", email, environment, flags]);
        return { email, environment, flags };
      },
    },
  });

  assert.deepEqual(result.flags, {
    existingFlag: true,
    flightAwareEnabled: true,
  });
  assert.deepEqual(calls, [
    ["read", "owner@example.com", { environment: "local" }],
    ["upsert", "owner@example.com", "local", { existingFlag: true, flightAwareEnabled: true }],
  ]);
}

{
  const calls = [];
  const result = await applyFeatureFlagCommand({
    command: parseFeatureFlagCommand(["clear", "owner@example.com", "flightAwareEnabled"]),
    repository: {
      async readFlagsByEmail(email, options) {
        calls.push(["read", email, options]);
        return { flags: { flightAwareEnabled: true, otherFlag: true } };
      },
      async upsertFlagsByEmail({ email, environment, flags }) {
        calls.push(["upsert", email, environment, flags]);
        return { email, environment, flags };
      },
    },
  });

  assert.deepEqual(result.flags, { otherFlag: true });
  assert.deepEqual(calls, [
    ["read", "owner@example.com", { environment: "local" }],
    ["upsert", "owner@example.com", "local", { otherFlag: true }],
  ]);
}

{
  const calls = [];
  const result = await applyFeatureFlagCommand({
    command: parseFeatureFlagCommand(["clear", "owner@example.com"]),
    repository: {
      async deleteFlagsByEmail(email, options) {
        calls.push(["delete", email, options]);
        return { email, environment: options.environment };
      },
    },
  });

  assert.deepEqual(result, { email: "owner@example.com", environment: "local", flags: {} });
  assert.deepEqual(calls, [["delete", "owner@example.com", { environment: "local" }]]);
}

console.log("feature-flags.model.test.js ok");
