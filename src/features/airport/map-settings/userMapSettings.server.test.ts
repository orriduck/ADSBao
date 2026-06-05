import assert from "node:assert/strict";

import {
  persistMapSettingsForUser,
  resolveMapSettingsForUser,
} from "./userMapSettings.server";
import {
  MAP_MODE_IDS,
} from "./mapSettingsModel";

const user = {
  primaryEmailAddress: { emailAddress: "Owner@Example.COM" },
};

{
  const calls: Array<Record<string, any>> = [];
  const settings = await resolveMapSettingsForUser({
    user,
    env: { VERCEL_ENV: "preview" },
    featureFlagsRepository: {
      async readFlagsByEmail(email, options) {
        calls.push({ type: "flags", email, options });
        throw new Error("map settings should not read feature flags");
      },
    },
    repository: {
      async readSettingsByEmail(email, options) {
        calls.push({ type: "settings", email, options });
        return {
          settings: {
            selectedMode: "immersive",
            baseMode: "immersive",
            hasSelectedMode: true,
          },
        };
      },
    },
  });

  assert.equal(settings.selectedMode, MAP_MODE_IDS.CONTROLLER);
  assert.deepEqual(calls, [
    {
      type: "settings",
      email: "owner@example.com",
      options: { device: undefined },
    },
  ]);
}

{
  const calls: Array<Record<string, any>> = [];
  await persistMapSettingsForUser({
    user,
    env: { VERCEL_ENV: "preview" },
    featureFlagsRepository: {
      async readFlagsByEmail() {
        throw new Error("map settings should not read feature flags");
      },
    },
    repository: {
      async upsertSettingsByEmail(options) {
        calls.push(options);
        return { settings: options.settings };
      },
    },
    settings: {
      selectedMode: "immersive",
      baseMode: "immersive",
      hasSelectedMode: true,
    },
    device: "mobile",
  });

  assert.equal(calls[0].email, "owner@example.com");
  assert.equal(calls[0].device, "mobile");
  assert.equal(calls[0].settings.selectedMode, MAP_MODE_IDS.CONTROLLER);
}

console.log("userMapSettings.server.test.ts ok");
