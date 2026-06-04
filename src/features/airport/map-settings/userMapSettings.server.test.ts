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
        return { flags: { immersiveModeEnabled: true } };
      },
    },
    repository: {
      async readSettingsByEmail(email, options) {
        calls.push({ type: "settings", email, options });
        return {
          settings: {
            selectedMode: MAP_MODE_IDS.IMMERSIVE,
            baseMode: MAP_MODE_IDS.IMMERSIVE,
            hasSelectedMode: true,
          },
        };
      },
    },
  });

  assert.equal(settings.selectedMode, MAP_MODE_IDS.IMMERSIVE);
  assert.deepEqual(calls, [
    {
      type: "flags",
      email: "owner@example.com",
      options: { environment: "preview" },
    },
    {
      type: "settings",
      email: "owner@example.com",
      options: { immersiveModeEnabled: true },
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
        return { flags: { immersiveModeEnabled: true } };
      },
    },
    repository: {
      async upsertSettingsByEmail(options) {
        calls.push(options);
        return { settings: options.settings };
      },
    },
    settings: {
      selectedMode: MAP_MODE_IDS.IMMERSIVE,
      baseMode: MAP_MODE_IDS.IMMERSIVE,
      hasSelectedMode: true,
    },
  });

  assert.equal(calls[0].email, "owner@example.com");
  assert.equal(calls[0].immersiveModeEnabled, true);
  assert.equal(calls[0].settings.selectedMode, MAP_MODE_IDS.IMMERSIVE);
}

console.log("userMapSettings.server.test.ts ok");
