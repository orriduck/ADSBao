import assert from "node:assert/strict";

import {
  REFRESH_TTL_MS,
  isRefreshDue,
  runRefreshWithLock,
} from "./ourAirportsRefresh.js";

const now = Date.now();
const isoMinusHours = (h) => new Date(now - h * 3600_000).toISOString();

// isRefreshDue: empty meta / null timestamps -> due
assert.equal(isRefreshDue(null, REFRESH_TTL_MS, now), true);
assert.equal(isRefreshDue({}, REFRESH_TTL_MS, now), true);
assert.equal(isRefreshDue({ last_imported_at: null }, REFRESH_TTL_MS, now), true);
// fresh -> not due
assert.equal(
  isRefreshDue({ last_imported_at: isoMinusHours(2) }, REFRESH_TTL_MS, now),
  false,
);
assert.equal(
  isRefreshDue({ last_imported_at: isoMinusHours(23) }, REFRESH_TTL_MS, now),
  false,
);
// past TTL -> due
assert.equal(
  isRefreshDue({ last_imported_at: isoMinusHours(25) }, REFRESH_TTL_MS, now),
  true,
);
// custom TTL
assert.equal(
  isRefreshDue(
    { last_imported_at: isoMinusHours(3) },
    2 * 3600_000,
    now,
  ),
  true,
);

// runRefreshWithLock: no service-role key -> skip without error
{
  const result = await runRefreshWithLock({
    env: {},
    createClientImpl: () => {
      throw new Error("should not construct a client without keys");
    },
  });
  assert.deepEqual(result, { ran: false, reason: "no_service_role" });
}

// runRefreshWithLock: fresh meta -> skip
{
  const calls = [];
  const fakeClient = createFakeMetaClient({
    selectData: { last_imported_at: isoMinusHours(2) },
  }, calls);
  const result = await runRefreshWithLock({
    env: { NEXT_PUBLIC_SUPABASE_URL: "https://x.test", SUPABASE_SERVICE_ROLE_KEY: "key" },
    createClientImpl: () => fakeClient,
    importerFactory: () => {
      throw new Error("importer should not be called when meta is fresh");
    },
  });
  assert.deepEqual(result, { ran: false, reason: "fresh" });
  // Only the select happened; no update / upsert.
  assert.ok(calls.some((c) => c.kind === "select"));
  assert.ok(!calls.some((c) => c.kind === "update"));
}

// runRefreshWithLock: stale meta, lock acquired -> import runs, success recorded
{
  const calls = [];
  const fakeClient = createFakeMetaClient({
    selectData: { last_imported_at: isoMinusHours(48), last_attempted_at: null, last_status: "" },
    updateRowCount: 1,
  }, calls);
  const importer = {
    import: async () => ({ airports: 80000, runways: 45000, frequencies: 30000, navaids: 11000 }),
  };
  const result = await runRefreshWithLock({
    env: { NEXT_PUBLIC_SUPABASE_URL: "https://x.test", SUPABASE_SERVICE_ROLE_KEY: "key" },
    createClientImpl: () => fakeClient,
    importerFactory: () => importer,
  });
  assert.equal(result.ran, true);
  assert.deepEqual(result.counts, {
    airports: 80000, runways: 45000, frequencies: 30000, navaids: 11000,
  });
  const updates = calls.filter((c) => c.kind === "update");
  assert.equal(updates.length, 2);
  assert.equal(updates[0].values.last_status, "in_progress");
  assert.equal(updates[1].values.last_status, "success");
  assert.equal(updates[1].values.airports_count, 80000);
}

// runRefreshWithLock: stale meta but another refresh in flight -> skip
{
  const calls = [];
  const fakeClient = createFakeMetaClient({
    selectData: {
      last_imported_at: isoMinusHours(48),
      last_attempted_at: isoMinusHours(0.05), // 3 minutes ago
      last_status: "in_progress",
    },
  }, calls);
  const result = await runRefreshWithLock({
    env: { NEXT_PUBLIC_SUPABASE_URL: "https://x.test", SUPABASE_SERVICE_ROLE_KEY: "key" },
    createClientImpl: () => fakeClient,
    importerFactory: () => ({
      import: async () => { throw new Error("should not import when locked"); },
    }),
  });
  assert.deepEqual(result, { ran: false, reason: "locked" });
}

// runRefreshWithLock: lock contended (UPDATE returns zero rows) -> skip
{
  const calls = [];
  const fakeClient = createFakeMetaClient({
    selectData: { last_imported_at: isoMinusHours(48), last_attempted_at: null },
    updateRowCount: 0,
  }, calls);
  const result = await runRefreshWithLock({
    env: { NEXT_PUBLIC_SUPABASE_URL: "https://x.test", SUPABASE_SERVICE_ROLE_KEY: "key" },
    createClientImpl: () => fakeClient,
    importerFactory: () => ({
      import: async () => { throw new Error("should not import when lock not acquired"); },
    }),
  });
  assert.deepEqual(result, { ran: false, reason: "locked" });
}

// runRefreshWithLock: importer failure -> records error and rethrows
{
  const calls = [];
  const fakeClient = createFakeMetaClient({
    selectData: { last_imported_at: isoMinusHours(48), last_attempted_at: null },
    updateRowCount: 1,
  }, calls);
  await assert.rejects(
    runRefreshWithLock({
      env: { NEXT_PUBLIC_SUPABASE_URL: "https://x.test", SUPABASE_SERVICE_ROLE_KEY: "key" },
      createClientImpl: () => fakeClient,
      importerFactory: () => ({
        import: async () => { throw new Error("network down"); },
      }),
    }),
    /network down/,
  );
  const updates = calls.filter((c) => c.kind === "update");
  assert.equal(updates[0].values.last_status, "in_progress");
  assert.equal(updates[1].values.last_status, "error");
  assert.ok(updates[1].values.last_error.includes("network down"));
}

console.log("ourAirportsRefresh.test.js: ok");

function createFakeMetaClient({ selectData, updateRowCount = 1 }, calls) {
  return {
    from(table) {
      calls.push({ kind: "from", table });
      const builder = {
        select(columns) {
          calls.push({ kind: "select", columns });
          return builder;
        },
        eq(column, value) {
          calls.push({ kind: "eq", column, value });
          return builder;
        },
        or(expression) {
          calls.push({ kind: "or", expression });
          return builder;
        },
        async maybeSingle() {
          return { data: selectData, error: null };
        },
        update(values) {
          calls.push({ kind: "update", values });
          return {
            eq(column, value) {
              calls.push({ kind: "eq_after_update", column, value });
              const result = { data: Array.from({ length: updateRowCount }, () => ({ id: "singleton" })), error: null };
              return {
                or(expression) {
                  calls.push({ kind: "or_after_update", expression });
                  return {
                    select() {
                      return Promise.resolve(result);
                    },
                  };
                },
                select() {
                  return Promise.resolve(result);
                },
                then(resolve, reject) {
                  return Promise.resolve({ data: null, error: null }).then(resolve, reject);
                },
              };
            },
          };
        },
      };
      return builder;
    },
  };
}
