import assert from "node:assert/strict";

import {
  USER_MAP_SETTINGS_TABLE,
  createUserMapSettingsRepository,
  createUserMapSettingsRepositoryFromEnv,
} from "./userMapSettings.dao";
import {
  MAP_LAYER_KEYS,
  MAP_MODE_IDS,
} from "../../../features/airport/map-settings/mapSettingsModel";

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
  const repository = createUserMapSettingsRepository({
    supabaseUrl: "https://example.supabase.co",
    supabaseKey: "sb_secret_test",
    environment: "preview",
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
  assert.equal(calls[2].type, "upsert");
  assert.equal(calls[2].row.email, "owner@example.com");
  assert.equal(calls[2].row.environment, "preview");
  assert.deepEqual(calls[2].options, { onConflict: "email,environment" });
  assert.equal(calls[2].row.has_selected_mode, true);
  assert.deepEqual(calls[2].row.settings.layerOverrides, {
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
  const repository = createUserMapSettingsRepository({
    supabaseUrl: "https://example.supabase.co",
    supabaseKey: "sb_secret_test",
    environment: "production",
    createClientImpl,
  });

  const row = await repository.readSettingsByEmail(" Owner@Example.COM ");

  assert.deepEqual(calls.slice(1), [
    { type: "from", table: USER_MAP_SETTINGS_TABLE },
    { type: "select", columns: "email,environment,settings,has_selected_mode,updated_at" },
    { type: "eq", column: "email", value: "owner@example.com" },
    { type: "eq", column: "environment", value: "production" },
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
  const repository = createUserMapSettingsRepository({
    supabaseUrl: "https://example.supabase.co",
    supabaseKey: "sb_secret_test",
    createClientImpl,
  });

  await assert.rejects(
    () => repository.readSettingsByEmail("owner@example.com"),
    /User map settings read failed \(permission denied\)/,
  );
}

console.log("userMapSettings.dao.test.ts ok");
