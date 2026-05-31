import assert from "node:assert/strict";

import {
  USER_FEATURE_FLAGS_TABLE,
  createUserFeatureFlagsRepository,
  createUserFeatureFlagsRepositoryFromEnv,
} from "./userFeatureFlags.dao";

function createFakeSupabaseClient({
  readData = null,
  readError = null,
  writeData = null,
  writeError = null,
  deleteError = null,
} = {}) {
  const calls = [];
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
    delete() {
      calls.push({ type: "delete" });
      query._deleteMode = true;
      return query;
    },
    then(resolve) {
      if (query._deleteMode) {
        query._deleteMode = false;
        return Promise.resolve({ error: deleteError }).then(resolve);
      }
      return Promise.resolve({ data: null, error: null }).then(resolve);
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
      flags: { flightAwareEnabled: true, otherFlag: "true" },
      updated_at: "2026-05-26T12:00:00.000Z",
    },
  });
  const repository = createUserFeatureFlagsRepository({
    supabaseUrl: "https://example.supabase.co",
    supabaseKey: "sb_secret_test",
    environment: "preview",
    createClientImpl,
  });

  const row = await repository.upsertFlagsByEmail({
    email: " Owner@Example.COM ",
    flags: { flightAwareEnabled: true, otherFlag: "true" },
  });

  assert.equal(calls[1].type, "from");
  assert.equal(calls[2].type, "upsert");
  assert.equal(calls[2].row.email, "owner@example.com");
  assert.equal(calls[2].row.environment, "preview");
  assert.deepEqual(calls[2].row.flags, {
    flightAwareEnabled: true,
    otherFlag: false,
  });
  assert.deepEqual(calls[2].options, { onConflict: "email,environment" });
  assert.deepEqual(row, {
    email: "owner@example.com",
    environment: "preview",
    flags: { flightAwareEnabled: true, otherFlag: false },
    updatedAt: "2026-05-26T12:00:00.000Z",
  });
}

{
  const { calls, createClientImpl } = createFakeSupabaseClient();
  const repository = createUserFeatureFlagsRepository({
    supabaseUrl: "https://example.supabase.co",
    supabaseKey: "sb_secret_test",
    environment: "preview",
    createClientImpl,
  });

  const result = await repository.deleteFlagsByEmail(" Owner@Example.COM ");

  assert.deepEqual(result, { email: "owner@example.com", environment: "preview" });
  assert.deepEqual(calls.slice(1), [
    { type: "from", table: USER_FEATURE_FLAGS_TABLE },
    { type: "delete" },
    { type: "eq", column: "email", value: "owner@example.com" },
    { type: "eq", column: "environment", value: "preview" },
  ]);
}

{
  const { calls, createClientImpl } = createFakeSupabaseClient({
    readData: {
      email: "owner@example.com",
      environment: "preview",
      flags: { flightAwareEnabled: true, otherFlag: "true" },
      updated_at: "2026-05-26T12:00:00.000Z",
    },
  });
  const repository = createUserFeatureFlagsRepository({
    supabaseUrl: "https://example.supabase.co",
    supabaseKey: "sb_secret_test",
    environment: "preview",
    createClientImpl,
  });

  const row = await repository.readFlagsByEmail(" Owner@Example.COM ");

  assert.equal(calls[0].supabaseKey, "sb_secret_test");
  assert.deepEqual(calls.slice(1), [
    { type: "from", table: USER_FEATURE_FLAGS_TABLE },
    { type: "select", columns: "email,environment,flags,updated_at" },
    { type: "eq", column: "email", value: "owner@example.com" },
    { type: "eq", column: "environment", value: "preview" },
    { type: "maybeSingle" },
  ]);
  assert.deepEqual(row, {
    email: "owner@example.com",
    environment: "preview",
    flags: { flightAwareEnabled: true, otherFlag: false },
    updatedAt: "2026-05-26T12:00:00.000Z",
  });
}

{
  const { calls, createClientImpl } = createFakeSupabaseClient();
  const repository = createUserFeatureFlagsRepository({
    supabaseUrl: "https://example.supabase.co",
    supabaseKey: "sb_secret_test",
    createClientImpl,
  });

  assert.equal(await repository.readFlagsByEmail(""), null);
  assert.equal(calls.length, 1);
}

{
  const { createClientImpl } = createFakeSupabaseClient({
    readError: { message: "permission denied" },
  });
  const repository = createUserFeatureFlagsRepository({
    supabaseUrl: "https://example.supabase.co",
    supabaseKey: "sb_secret_test",
    createClientImpl,
  });

  await assert.rejects(
    () => repository.readFlagsByEmail("owner@example.com"),
    /User feature flags read failed \(permission denied\)/,
  );
}

{
  const { calls, createClientImpl } = createFakeSupabaseClient();
  const repository = createUserFeatureFlagsRepositoryFromEnv({
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      SUPABASE_SERVICE_ROLE_KEY: "sb_service_role_test",
      VERCEL_ENV: "preview",
    },
    createClientImpl,
  });

  assert.ok(repository);
  assert.equal(calls[0].supabaseKey, "sb_service_role_test");
  await repository.readFlagsByEmail("owner@example.com");
  assert.deepEqual(calls.slice(1), [
    { type: "from", table: USER_FEATURE_FLAGS_TABLE },
    { type: "select", columns: "email,environment,flags,updated_at" },
    { type: "eq", column: "email", value: "owner@example.com" },
    { type: "eq", column: "environment", value: "preview" },
    { type: "maybeSingle" },
  ]);
}

assert.equal(
  createUserFeatureFlagsRepositoryFromEnv({
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    },
  }),
  null,
);

console.log("userFeatureFlags.dao.test.ts ok");
