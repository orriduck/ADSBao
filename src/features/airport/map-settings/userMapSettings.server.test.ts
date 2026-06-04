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
        throw new Error("immersive mode should not read feature flags");
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
      type: "settings",
      email: "owner@example.com",
      options: undefined,
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
        throw new Error("immersive mode should not read feature flags");
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
  assert.equal("immersiveModeEnabled" in calls[0], false);
  assert.equal(calls[0].settings.selectedMode, MAP_MODE_IDS.IMMERSIVE);
}

console.log("userMapSettings.server.test.ts ok");
