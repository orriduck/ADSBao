import assert from "node:assert/strict";

import {
  SOCIAL_PRESENCE_TABLE,
  SOCIAL_REACTIONS_TABLE,
  createSocialRepository,
  createSocialRepositoryFromEnv,
} from "./social.dao.js";

const now = () => Date.parse("2026-05-24T12:00:00.000Z");

function createFakeSupabaseClient({
  existingReaction = null,
  existingReactionError = null,
  summaryRows = [],
  viewerRows = [],
  presenceRows = [],
  writeError = null,
} = {}) {
  const calls = [];
  const createClientImpl = (supabaseUrl, supabaseKey, options) => {
    calls.push({ type: "createClient", supabaseUrl, supabaseKey, options });
    return {
      from(table) {
        calls.push({ type: "from", table });
        const builder = {
          insertedRow: null,
          updatedRow: null,
          selectColumns: "",
          hasSessionHashFilter: false,
          select(columns) {
            this.selectColumns = columns;
            calls.push({ type: "select", columns });
            return this;
          },
          eq(column, value) {
            if (column === "session_hash") this.hasSessionHashFilter = true;
            calls.push({ type: "eq", column, value });
            return this;
          },
          is(column, value) {
            calls.push({ type: "is", column, value });
            return this;
          },
          gt(column, value) {
            calls.push({ type: "gt", column, value });
            return this;
          },
          upsert(row, options) {
            this.insertedRow = row;
            calls.push({ type: "upsert", row, options });
            return this;
          },
          insert(row) {
            this.insertedRow = row;
            calls.push({ type: "insert", row });
            return this;
          },
          update(row) {
            this.updatedRow = row;
            calls.push({ type: "update", row });
            return this;
          },
          order(column, options) {
            calls.push({ type: "order", column, options });
            return this;
          },
          limit(count) {
            calls.push({ type: "limit", count });
            return this;
          },
          async maybeSingle() {
            calls.push({ type: "maybeSingle" });
            return { data: existingReaction, error: existingReactionError };
          },
          async single() {
            calls.push({ type: "single" });
            return { data: this.insertedRow || this.updatedRow, error: writeError };
          },
          then(resolve) {
            calls.push({ type: "then", columns: this.selectColumns });
            if (table === SOCIAL_PRESENCE_TABLE) {
              return resolve({ data: presenceRows, error: null });
            }
            if (this.hasSessionHashFilter) {
              return resolve({ data: viewerRows, error: null });
            }
            return resolve({ data: summaryRows, error: null });
          },
        };
        return builder;
      },
    };
  };
  return { calls, createClientImpl };
}

assert.equal(SOCIAL_PRESENCE_TABLE, "social_presence");
assert.equal(SOCIAL_REACTIONS_TABLE, "social_reactions");

{
  const { calls, createClientImpl } = createFakeSupabaseClient();
  const repo = createSocialRepository({
    supabaseUrl: "https://example.supabase.co",
    supabaseKey: "sb_secret_test",
    createClientImpl,
    now,
  });

  await repo.heartbeatPresence({
    sessionHash: "hash-1",
    entityType: "airport",
    entityKey: "KBOS",
    contextAirportIcao: "KBOS",
  });

  const upsert = calls.find((call) => call.type === "upsert");
  assert.equal(upsert.row.session_hash, "hash-1");
  assert.equal(upsert.row.entity_type, "airport");
  assert.equal(upsert.row.entity_key, "KBOS");
  assert.equal(upsert.row.context_airport_icao, "KBOS");
  assert.equal(upsert.row.last_seen_at, "2026-05-24T12:00:00.000Z");
  assert.equal(upsert.row.deleted_at, null);
  assert.equal(
    upsert.options.onConflict,
    "session_hash,entity_type,entity_key,context_airport_icao",
  );
}

{
  const { calls, createClientImpl } = createFakeSupabaseClient({
    existingReaction: { id: "r1", deleted_at: null },
  });
  const repo = createSocialRepository({
    supabaseUrl: "https://example.supabase.co",
    supabaseKey: "sb_secret_test",
    createClientImpl,
    now,
  });

  const result = await repo.toggleReaction({
    sessionHash: "hash-1",
    entityType: "aircraft",
    entityKey: "A1B2C3",
    contextAirportIcao: "KBOS",
    reaction: "camera",
  });

  assert.deepEqual(result, { active: false, reaction: "camera" });
  const update = calls.find((call) => call.type === "update");
  assert.equal(update.row.deleted_at, "2026-05-24T12:00:00.000Z");
}

{
  const { calls, createClientImpl } = createFakeSupabaseClient({
    existingReaction: { id: "r1", deleted_at: "2026-05-24T11:00:00.000Z" },
  });
  const repo = createSocialRepository({
    supabaseUrl: "https://example.supabase.co",
    supabaseKey: "sb_secret_test",
    createClientImpl,
    now,
  });

  const result = await repo.toggleReaction({
    sessionHash: "hash-1",
    entityType: "aircraft",
    entityKey: "A1B2C3",
    contextAirportIcao: "KBOS",
    reaction: "camera",
  });

  assert.deepEqual(result, { active: true, reaction: "camera" });
  const update = calls.find((call) => call.type === "update");
  assert.equal(update.row.deleted_at, null);
  assert.equal(update.row.updated_at, "2026-05-24T12:00:00.000Z");
}

{
  const { calls, createClientImpl } = createFakeSupabaseClient();
  const repo = createSocialRepository({
    supabaseUrl: "https://example.supabase.co",
    supabaseKey: "sb_secret_test",
    createClientImpl,
    now,
  });

  const result = await repo.toggleReaction({
    sessionHash: "hash-1",
    entityType: "airport",
    entityKey: "KBOS",
    contextAirportIcao: "KBOS",
    reaction: "like",
  });

  assert.deepEqual(result, { active: true, reaction: "like" });
  const insert = calls.find((call) => call.type === "insert");
  assert.equal(insert.row.session_hash, "hash-1");
  assert.equal(insert.row.reaction, "like");
  assert.equal(insert.row.deleted_at, null);
}

{
  const { createClientImpl } = createFakeSupabaseClient({
    presenceRows: [{ session_hash: "a" }, { session_hash: "b" }],
    summaryRows: [{ reaction: "fire" }, { reaction: "fire" }, { reaction: "camera" }],
    viewerRows: [{ reaction: "camera" }],
  });
  const repo = createSocialRepository({
    supabaseUrl: "https://example.supabase.co",
    supabaseKey: "sb_secret_test",
    createClientImpl,
    now,
  });

  const summary = await repo.readSummary({
    sessionHash: "hash-1",
    entityType: "airport",
    entityKey: "KBOS",
    contextAirportIcao: "KBOS",
  });

  assert.equal(summary.watching, 2);
  assert.equal(summary.reactions.fire, 2);
  assert.equal(summary.reactions.camera, 1);
  assert.deepEqual(summary.viewerReactions, ["camera"]);
}

{
  const { calls, createClientImpl } = createFakeSupabaseClient();
  const repo = createSocialRepositoryFromEnv({
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SECRET_KEY: "sb_secret_from_env",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_unused",
    },
    createClientImpl,
    now,
  });
  await repo.heartbeatPresence({
    sessionHash: "hash-1",
    entityType: "airport",
    entityKey: "KBOS",
    contextAirportIcao: "KBOS",
  });
  assert.equal(calls[0].supabaseKey, "sb_secret_from_env");
}

assert.equal(
  createSocialRepository({
    supabaseUrl: "",
    supabaseKey: "sb_secret",
    createClientImpl: () => ({}),
  }),
  null,
);
