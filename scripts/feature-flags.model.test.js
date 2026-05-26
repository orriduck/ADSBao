import assert from "node:assert/strict";

import {
  applyFeatureFlagCommand,
  parseFeatureFlagCommand,
} from "./feature-flags.model.js";

assert.deepEqual(
  parseFeatureFlagCommand(["set", " Owner@Example.COM ", "flightAwareEnabled", "on"]),
  {
    action: "set",
    email: "owner@example.com",
    flagKey: "flightAwareEnabled",
    flagValue: true,
  },
);

assert.deepEqual(
  parseFeatureFlagCommand(["set", "owner@example.com", "flightAwareEnabled", "off"]),
  {
    action: "set",
    email: "owner@example.com",
    flagKey: "flightAwareEnabled",
    flagValue: false,
  },
);

assert.deepEqual(
  parseFeatureFlagCommand(["merge", "owner@example.com", '{"flightAwareEnabled":true,"other":"true"}']),
  {
    action: "merge",
    email: "owner@example.com",
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
    flagKey: "flightAwareEnabled",
  },
);

assert.deepEqual(
  parseFeatureFlagCommand(["clear", "owner@example.com"]),
  {
    action: "clear-user",
    email: "owner@example.com",
  },
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
      async readFlagsByEmail(email) {
        calls.push(["read", email]);
        return { flags: { existingFlag: true } };
      },
      async upsertFlagsByEmail({ email, flags }) {
        calls.push(["upsert", email, flags]);
        return { email, flags };
      },
    },
  });

  assert.deepEqual(result.flags, {
    existingFlag: true,
    flightAwareEnabled: true,
  });
  assert.deepEqual(calls, [
    ["read", "owner@example.com"],
    ["upsert", "owner@example.com", { existingFlag: true, flightAwareEnabled: true }],
  ]);
}

{
  const calls = [];
  const result = await applyFeatureFlagCommand({
    command: parseFeatureFlagCommand(["clear", "owner@example.com", "flightAwareEnabled"]),
    repository: {
      async readFlagsByEmail(email) {
        calls.push(["read", email]);
        return { flags: { flightAwareEnabled: true, otherFlag: true } };
      },
      async upsertFlagsByEmail({ email, flags }) {
        calls.push(["upsert", email, flags]);
        return { email, flags };
      },
    },
  });

  assert.deepEqual(result.flags, { otherFlag: true });
  assert.deepEqual(calls, [
    ["read", "owner@example.com"],
    ["upsert", "owner@example.com", { otherFlag: true }],
  ]);
}

{
  const calls = [];
  const result = await applyFeatureFlagCommand({
    command: parseFeatureFlagCommand(["clear", "owner@example.com"]),
    repository: {
      async deleteFlagsByEmail(email) {
        calls.push(["delete", email]);
        return { email };
      },
    },
  });

  assert.deepEqual(result, { email: "owner@example.com", flags: {} });
  assert.deepEqual(calls, [["delete", "owner@example.com"]]);
}

console.log("feature-flags.model.test.js ok");
