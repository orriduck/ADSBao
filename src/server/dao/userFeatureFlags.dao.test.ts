import assert from "node:assert/strict";

import { createUserFeatureFlagsRepositoryFromEnv } from "./userFeatureFlags.dao";

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
    {
      rows: [
        {
          email: "owner@example.com",
          environment: "preview",
          flags: { flightAwareEnabled: true, otherFlag: "true" },
          updated_at: "2026-05-26T12:00:00.000Z",
        },
      ],
    },
  ]);
  const repository = createUserFeatureFlagsRepositoryFromEnv({
    env: { FEATURE_FLAGS_ENV: "preview" },
    queryClient,
  });

  const row = await repository.upsertFlagsByEmail({
    email: " Owner@Example.COM ",
    flags: { flightAwareEnabled: true, otherFlag: "true" },
  });

  assert.match(normalizeSql(calls[0].text), /^insert into app_user\.user_feature_flags/i);
  assert.deepEqual(calls[0].values.slice(0, 3), [
    "owner@example.com",
    "preview",
    { flightAwareEnabled: true, otherFlag: false },
  ]);
  assert.deepEqual(row, {
    email: "owner@example.com",
    environment: "preview",
    flags: { flightAwareEnabled: true, otherFlag: false },
    updatedAt: "2026-05-26T12:00:00.000Z",
  });
}

{
  const { calls, queryClient } = createFakePostgresClient([{ rows: [] }]);
  const repository = createUserFeatureFlagsRepositoryFromEnv({
    env: { FEATURE_FLAGS_ENV: "preview" },
    queryClient,
  });

  const result = await repository.deleteFlagsByEmail(" Owner@Example.COM ");

  assert.deepEqual(result, { email: "owner@example.com", environment: "preview" });
  assert.match(normalizeSql(calls[0].text), /^delete from app_user\.user_feature_flags/i);
  assert.deepEqual(calls[0].values, ["owner@example.com", "preview"]);
}

{
  const { calls, queryClient } = createFakePostgresClient([
    {
      rows: [
        {
          email: "owner@example.com",
          environment: "preview",
          flags: { flightAwareEnabled: true, otherFlag: "true" },
          updated_at: "2026-05-26T12:00:00.000Z",
        },
      ],
    },
  ]);
  const repository = createUserFeatureFlagsRepositoryFromEnv({
    env: { FEATURE_FLAGS_ENV: "preview" },
    queryClient,
  });

  const row = await repository.readFlagsByEmail(" Owner@Example.COM ");

  assert.match(
    normalizeSql(calls[0].text),
    /^select email,environment,flags,updated_at from app_user\.user_feature_flags/i,
  );
  assert.deepEqual(calls[0].values, ["owner@example.com", "preview"]);
  assert.deepEqual(row, {
    email: "owner@example.com",
    environment: "preview",
    flags: { flightAwareEnabled: true, otherFlag: false },
    updatedAt: "2026-05-26T12:00:00.000Z",
  });
}

{
  const { calls, queryClient } = createFakePostgresClient();
  const repository = createUserFeatureFlagsRepositoryFromEnv({ queryClient });

  assert.equal(await repository.readFlagsByEmail(""), null);
  assert.equal(calls.length, 0);
}

{
  const { queryClient } = createFakePostgresClient([{ error: "permission denied" }]);
  const repository = createUserFeatureFlagsRepositoryFromEnv({ queryClient });

  await assert.rejects(
    () => repository.readFlagsByEmail("owner@example.com"),
    /User feature flags read failed \(permission denied\)/,
  );
}

assert.equal(createUserFeatureFlagsRepositoryFromEnv({ env: {} }), null);

console.log("userFeatureFlags.dao.test.ts ok");
