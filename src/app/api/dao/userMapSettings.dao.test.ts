import assert from "node:assert/strict";

import { createUserMapSettingsRepositoryFromEnv } from "./userMapSettings.dao";
import {
  MAP_LAYER_KEYS,
  MAP_MODE_IDS,
} from "../../../features/airport/map-settings/mapSettingsModel";

function createFakePostgresClient(responses: Array<Record<string, any>> = []) {
  const calls: Array<Record<string, any>> = [];
  return {
    calls,
    queryClient: {
      async query(text: string, values: unknown[] = []) {
        calls.push({ text, values });
        const response = responses.shift() || {};
        if (response.error) throw new Error(response.error);
        const rows = response.rows || [];
        return { rows, rowCount: response.rowCount ?? rows.length };
      },
    },
  };
}

const normalizeSql = (sql: string) => sql.replace(/\s+/g, " ").trim();

{
  const { calls, queryClient } = createFakePostgresClient([
    { rows: [] },
    {
      rows: [
        {
          email: "owner@example.com",
          environment: "preview",
          device: "desktop",
          settings: {
            selectedMode: MAP_MODE_IDS.CUSTOM,
            baseMode: MAP_MODE_IDS.SPOTTING,
            hasSelectedMode: true,
            layerOverrides: { [MAP_LAYER_KEYS.AIRSPACES]: true },
            updatedAt: "2026-06-02T15:00:00.000Z",
          },
          has_selected_mode: true,
          updated_at: "2026-06-02T15:00:00.000Z",
        },
      ],
    },
  ]);
  const repository = createUserMapSettingsRepositoryFromEnv({
    env: { VERCEL_ENV: "preview" },
    queryClient,
  });

  const row = await repository.upsertSettingsByEmail({
    email: " Owner@Example.COM ",
    settings: {
      selectedMode: MAP_MODE_IDS.CUSTOM,
      baseMode: MAP_MODE_IDS.SPOTTING,
      hasSelectedMode: true,
      layerOverrides: { [MAP_LAYER_KEYS.AIRSPACES]: true, bad: true },
      updatedAt: "2026-06-02T15:00:00.000Z",
    },
  });

  const writeCall = calls[1];
  assert.match(normalizeSql(writeCall.text), /^insert into user_map_settings/i);
  assert.equal(writeCall.values[0], "owner@example.com");
  assert.equal(writeCall.values[1], "preview");
  assert.equal(writeCall.values[2], "desktop");
  assert.equal(writeCall.values[4], true);
  assert.deepEqual(writeCall.values[3].layerOverrides, {
    [MAP_LAYER_KEYS.AIRSPACES]: true,
  });
  assert.deepEqual(row.settings.layerOverrides, {
    [MAP_LAYER_KEYS.AIRSPACES]: true,
  });
}

{
  const { calls, queryClient } = createFakePostgresClient([
    {
      rows: [
        {
          email: "owner@example.com",
          environment: "production",
          device: "desktop",
          settings: {
            selectedMode: MAP_MODE_IDS.CONTROLLER,
            layerOverrides: { [MAP_LAYER_KEYS.MAP_LABELS]: false },
            updatedAt: "2026-06-02T15:02:00.000Z",
          },
          has_selected_mode: false,
          updated_at: "2026-06-02T15:02:00.000Z",
        },
      ],
    },
  ]);
  const repository = createUserMapSettingsRepositoryFromEnv({
    env: { VERCEL_ENV: "production" },
    queryClient,
  });

  const row = await repository.readSettingsByEmail(" Owner@Example.COM ");

  assert.match(normalizeSql(calls[0].text), /^select email,environment,device,settings,has_selected_mode,updated_at from user_map_settings/i);
  assert.deepEqual(calls[0].values, ["owner@example.com", "production", "desktop"]);
  assert.equal(row.settings.selectedMode, MAP_MODE_IDS.CONTROLLER);
  assert.equal(row.settings.hasSelectedMode, false);
}

{
  const { queryClient } = createFakePostgresClient([{ error: "permission denied" }]);
  const repository = createUserMapSettingsRepositoryFromEnv({ queryClient });

  await assert.rejects(
    () => repository.readSettingsByEmail("owner@example.com"),
    /User map settings read failed \(permission denied\)/,
  );
}

{
  const { calls, queryClient } = createFakePostgresClient([
    {
      rows: [
        {
          email: "owner@example.com",
          environment: "preview",
          device: "desktop",
          settings: {
            selectedMode: MAP_MODE_IDS.CUSTOM,
            baseMode: MAP_MODE_IDS.CONTROLLER,
            hasSelectedMode: true,
            layerOverrides: {
              [MAP_LAYER_KEYS.AIRSPACES]: true,
              [MAP_LAYER_KEYS.USER_LOCATION]: true,
              [MAP_LAYER_KEYS.USER_LOCATION_AUDIO]: true,
            },
            updatedAt: "2026-06-02T15:06:00.000Z",
          },
          has_selected_mode: true,
          updated_at: "2026-06-02T15:06:00.000Z",
        },
      ],
    },
    {
      rows: [
        {
          email: "owner@example.com",
          environment: "preview",
          device: "desktop",
          settings: {
            selectedMode: MAP_MODE_IDS.CUSTOM,
            baseMode: MAP_MODE_IDS.CONTROLLER,
            hasSelectedMode: true,
            layerOverrides: {
              [MAP_LAYER_KEYS.AIRSPACES]: true,
              [MAP_LAYER_KEYS.USER_LOCATION]: true,
              [MAP_LAYER_KEYS.USER_LOCATION_AUDIO]: true,
              [MAP_LAYER_KEYS.MAP_LABELS]: false,
            },
            updatedAt: "2026-06-02T15:07:00.000Z",
          },
          has_selected_mode: true,
          updated_at: "2026-06-02T15:07:00.000Z",
        },
      ],
    },
  ]);
  const repository = createUserMapSettingsRepositoryFromEnv({
    env: { VERCEL_ENV: "preview" },
    queryClient,
  });

  await repository.upsertSettingsByEmail({
    email: "owner@example.com",
    settings: {
      layerOverrides: { [MAP_LAYER_KEYS.MAP_LABELS]: false },
      updatedAt: "2026-06-02T15:07:00.000Z",
    },
  });

  assert.deepEqual(calls[1].values[3].layerOverrides, {
    [MAP_LAYER_KEYS.AIRSPACES]: true,
    [MAP_LAYER_KEYS.USER_LOCATION]: true,
    [MAP_LAYER_KEYS.USER_LOCATION_AUDIO]: true,
    [MAP_LAYER_KEYS.MAP_LABELS]: false,
  });
}

{
  const { calls, queryClient } = createFakePostgresClient([
    {
      rows: [
        {
          email: "owner@example.com",
          environment: "preview",
          device: "desktop",
          settings: {
            selectedMode: "immersive",
            baseMode: "immersive",
            hasSelectedMode: true,
            layerOverrides: {},
            updatedAt: "2026-06-02T15:08:00.000Z",
          },
          has_selected_mode: true,
          updated_at: "2026-06-02T15:08:00.000Z",
        },
      ],
    },
    { rows: [] },
    {
      rows: [
        {
          email: "owner@example.com",
          environment: "preview",
          device: "desktop",
          settings: {
            selectedMode: MAP_MODE_IDS.CONTROLLER,
            baseMode: MAP_MODE_IDS.CONTROLLER,
            hasSelectedMode: true,
            layerOverrides: {},
            updatedAt: "2026-06-02T15:09:00.000Z",
          },
          has_selected_mode: true,
          updated_at: "2026-06-02T15:09:00.000Z",
        },
      ],
    },
  ]);
  const repository = createUserMapSettingsRepositoryFromEnv({
    env: { VERCEL_ENV: "preview" },
    queryClient,
  });

  const readRow = await repository.readSettingsByEmail("owner@example.com");
  assert.equal(readRow.settings.selectedMode, MAP_MODE_IDS.CONTROLLER);

  await repository.upsertSettingsByEmail({
    email: "owner@example.com",
    settings: {
      selectedMode: "immersive",
      baseMode: "immersive",
      hasSelectedMode: true,
      updatedAt: "2026-06-02T15:09:00.000Z",
    },
  });

  assert.equal(calls[2].values[3].selectedMode, MAP_MODE_IDS.CONTROLLER);
  assert.equal(calls[2].values[3].baseMode, MAP_MODE_IDS.CONTROLLER);
}

{
  const { calls, queryClient } = createFakePostgresClient([
    { rows: [] },
    {
      rows: [
        {
          email: "owner@example.com",
          environment: "preview",
          device: "mobile",
          settings: {
            selectedMode: MAP_MODE_IDS.RADIO,
            baseMode: MAP_MODE_IDS.RADIO,
            hasSelectedMode: true,
          },
          has_selected_mode: true,
        },
      ],
    },
  ]);
  const repository = createUserMapSettingsRepositoryFromEnv({
    env: { VERCEL_ENV: "preview" },
    queryClient,
  });

  const row = await repository.upsertSettingsByEmail({
    email: "owner@example.com",
    device: "mobile",
    settings: {
      selectedMode: MAP_MODE_IDS.RADIO,
      baseMode: MAP_MODE_IDS.RADIO,
      hasSelectedMode: true,
    },
  });

  assert.deepEqual(calls[0].values, ["owner@example.com", "preview", "mobile"]);
  assert.equal(calls[1].values[2], "mobile");
  assert.equal(row.device, "mobile");
}

assert.equal(createUserMapSettingsRepositoryFromEnv({ env: {} }), null);

console.log("userMapSettings.dao.test.ts ok");
