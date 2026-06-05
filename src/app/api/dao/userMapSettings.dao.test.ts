import assert from "node:assert/strict";

import { createUserMapSettingsRepositoryFromEnv } from "./userMapSettings.dao";
import {
  MAP_LAYER_KEYS,
  MAP_MODE_IDS,
} from "../../../features/airport/map-settings/mapSettingsModel";

const USER_MAP_SETTINGS_TABLE = "user_map_settings";

function createFakeSupabaseClient({
  readData = null,
  readError = null,
  writeData = null,
  writeError = null,
} = {}) {
  const calls: Array<Record<string, any>> = [];
  const query: Record<string, any> = {
    select(columns) {
      calls.push({ type: "select", columns });
      return query;
    },
    eq(column, value) {
      calls.push({ type: "eq", column, value });
      return query;
    },
    async maybeSingle() {
      calls.push({ type: "maybeSingle" });
      return { data: readData, error: readError };
    },
    upsert(row, options) {
      calls.push({ type: "upsert", row, options });
      return query;
    },
    async single() {
      calls.push({ type: "single" });
      return { data: writeData, error: writeError };
    },
  };

  const createClientImpl = (supabaseUrl, supabaseKey, options) => {
    calls.push({ type: "createClient", supabaseUrl, supabaseKey, options });
    return {
      from(table) {
        calls.push({ type: "from", table });
        return query;
      },
    };
  };

  return { calls, createClientImpl };
}

{
  const { calls, createClientImpl } = createFakeSupabaseClient({
    writeData: {
      email: "owner@example.com",
      environment: "preview",
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
  });
  const repository = createUserMapSettingsRepositoryFromEnv({
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "sb_secret_test",
      VERCEL_ENV: "preview",
    },
    createClientImpl,
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

  assert.equal(calls[1].type, "from");
  assert.equal(calls[1].table, USER_MAP_SETTINGS_TABLE);
  const upsertCall = calls.find((call) => call.type === "upsert");
  assert.ok(upsertCall, "repository should write a settings row");
  assert.equal(upsertCall.row.email, "owner@example.com");
  assert.equal(upsertCall.row.environment, "preview");
  assert.equal(upsertCall.row.device, "desktop");
  assert.deepEqual(upsertCall.options, { onConflict: "email,environment,device" });
  assert.equal(upsertCall.row.has_selected_mode, true);
  assert.deepEqual(upsertCall.row.settings.layerOverrides, {
    [MAP_LAYER_KEYS.AIRSPACES]: true,
  });
  assert.deepEqual(row.settings.layerOverrides, {
    [MAP_LAYER_KEYS.AIRSPACES]: true,
  });
}

{
  const { calls, createClientImpl } = createFakeSupabaseClient({
    readData: {
      email: "owner@example.com",
      environment: "production",
      settings: {
        selectedMode: MAP_MODE_IDS.CONTROLLER,
        layerOverrides: { [MAP_LAYER_KEYS.MAP_LABELS]: false },
        updatedAt: "2026-06-02T15:02:00.000Z",
      },
      has_selected_mode: false,
      updated_at: "2026-06-02T15:02:00.000Z",
    },
  });
  const repository = createUserMapSettingsRepositoryFromEnv({
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "sb_secret_test",
      VERCEL_ENV: "production",
    },
    createClientImpl,
  });

  const row = await repository.readSettingsByEmail(" Owner@Example.COM ");

  assert.deepEqual(calls.slice(1), [
    { type: "from", table: USER_MAP_SETTINGS_TABLE },
    { type: "select", columns: "email,environment,device,settings,has_selected_mode,updated_at" },
    { type: "eq", column: "email", value: "owner@example.com" },
    { type: "eq", column: "environment", value: "production" },
    { type: "eq", column: "device", value: "desktop" },
    { type: "maybeSingle" },
  ]);
  assert.equal(row.settings.selectedMode, MAP_MODE_IDS.CONTROLLER);
  assert.equal(row.settings.hasSelectedMode, false);
}

{
  const { calls, createClientImpl } = createFakeSupabaseClient();
  const repository = createUserMapSettingsRepositoryFromEnv({
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "sb_service_role_test",
      VERCEL_ENV: "preview",
    },
    createClientImpl,
  });

  assert.ok(repository);
  assert.equal(calls[0].supabaseKey, "sb_service_role_test");
}

{
  const { createClientImpl } = createFakeSupabaseClient({
    readError: { message: "permission denied" },
  });
  const repository = createUserMapSettingsRepositoryFromEnv({
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "sb_secret_test",
    },
    createClientImpl,
  });

  await assert.rejects(
    () => repository.readSettingsByEmail("owner@example.com"),
    /User map settings read failed \(permission denied\)/,
  );
}

{
  const { calls, createClientImpl } = createFakeSupabaseClient({
    readData: {
      email: "owner@example.com",
      environment: "preview",
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
    writeData: {
      email: "owner@example.com",
      environment: "preview",
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
  });
  const repository = createUserMapSettingsRepositoryFromEnv({
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "sb_secret_test",
      VERCEL_ENV: "preview",
    },
    createClientImpl,
  });

  await repository.upsertSettingsByEmail({
    email: "owner@example.com",
    settings: {
      layerOverrides: { [MAP_LAYER_KEYS.MAP_LABELS]: false },
      updatedAt: "2026-06-02T15:07:00.000Z",
    },
  });

  const upsertCall = calls.find((call) => call.type === "upsert");
  assert.ok(upsertCall, "repository should write the merged settings row");
  assert.deepEqual(upsertCall.row.settings.layerOverrides, {
    [MAP_LAYER_KEYS.AIRSPACES]: true,
    [MAP_LAYER_KEYS.USER_LOCATION]: true,
    [MAP_LAYER_KEYS.USER_LOCATION_AUDIO]: true,
    [MAP_LAYER_KEYS.MAP_LABELS]: false,
  });
}

{
  const { calls, createClientImpl } = createFakeSupabaseClient({
    readData: {
      email: "owner@example.com",
      environment: "preview",
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
    writeData: {
      email: "owner@example.com",
      environment: "preview",
      settings: {
        selectedMode: "immersive",
        baseMode: "immersive",
        hasSelectedMode: true,
        layerOverrides: {},
        updatedAt: "2026-06-02T15:09:00.000Z",
      },
      has_selected_mode: true,
      updated_at: "2026-06-02T15:09:00.000Z",
    },
  });
  const repository = createUserMapSettingsRepositoryFromEnv({
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "sb_secret_test",
      VERCEL_ENV: "preview",
    },
    createClientImpl,
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

  const upsertCall = calls.find((call) => call.type === "upsert");
  assert.ok(upsertCall, "repository should migrate legacy immersive account settings");
  assert.equal(upsertCall.row.settings.selectedMode, MAP_MODE_IDS.CONTROLLER);
  assert.equal(upsertCall.row.settings.baseMode, MAP_MODE_IDS.CONTROLLER);
}

{
  const { calls, createClientImpl } = createFakeSupabaseClient({
    writeData: {
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
  });
  const repository = createUserMapSettingsRepositoryFromEnv({
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "sb_secret_test",
      VERCEL_ENV: "preview",
    },
    createClientImpl,
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

  const deviceFilters = calls.filter(
    (call) => call.type === "eq" && call.column === "device",
  );
  assert.deepEqual(deviceFilters.map((call) => call.value), ["mobile"]);
  const upsertCall = calls.find((call) => call.type === "upsert");
  assert.equal(upsertCall.row.device, "mobile");
  assert.equal(row.device, "mobile");
}

console.log("userMapSettings.dao.test.ts ok");
