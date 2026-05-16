import assert from "node:assert/strict";

import {
  REFRESH_TTL_MS,
  pickNextStaleTable,
  runRefreshStepWithLock,
} from "./ourAirportsRefresh.js";

const now = Date.now();
const isoMinusHours = (h) => new Date(now - h * 3600_000).toISOString();

// pickNextStaleTable: empty meta -> airports (first in priority order)
assert.equal(pickNextStaleTable(null), "airports");
assert.equal(pickNextStaleTable({}), "airports");

// All fresh -> null
assert.equal(
  pickNextStaleTable({
    airports_imported_at: isoMinusHours(2),
    runways_imported_at: isoMinusHours(2),
    frequencies_imported_at: isoMinusHours(2),
    navaids_imported_at: isoMinusHours(2),
  }, REFRESH_TTL_MS, now),
  null,
);

// Airports stale, others fresh -> airports
assert.equal(
  pickNextStaleTable({
    airports_imported_at: isoMinusHours(25),
    runways_imported_at: isoMinusHours(2),
    frequencies_imported_at: isoMinusHours(2),
    navaids_imported_at: isoMinusHours(2),
  }, REFRESH_TTL_MS, now),
  "airports",
);

// Airports fresh, runways stale -> runways
assert.equal(
  pickNextStaleTable({
    airports_imported_at: isoMinusHours(2),
    runways_imported_at: isoMinusHours(25),
    frequencies_imported_at: isoMinusHours(2),
    navaids_imported_at: isoMinusHours(2),
  }, REFRESH_TTL_MS, now),
  "runways",
);

// All stale -> airports (priority order)
assert.equal(
  pickNextStaleTable({
    airports_imported_at: isoMinusHours(48),
    runways_imported_at: isoMinusHours(48),
    frequencies_imported_at: isoMinusHours(48),
    navaids_imported_at: isoMinusHours(48),
  }, REFRESH_TTL_MS, now),
  "airports",
);

// Only navaids stale -> navaids
assert.equal(
  pickNextStaleTable({
    airports_imported_at: isoMinusHours(2),
    runways_imported_at: isoMinusHours(2),
    frequencies_imported_at: isoMinusHours(2),
    navaids_imported_at: isoMinusHours(48),
  }, REFRESH_TTL_MS, now),
  "navaids",
);

// runRefreshStepWithLock: no service-role key -> skip cleanly
{
  const result = await runRefreshStepWithLock({
    env: {},
    createClientImpl: () => {
      throw new Error("should not construct client without keys");
    },
  });
  assert.deepEqual(result, { ran: false, reason: "no_service_role" });
}

// runRefreshStepWithLock: fresh -> skip
{
  const calls = [];
  const fakeClient = createFakeMetaClient({
    selectData: {
      airports_imported_at: isoMinusHours(2),
      runways_imported_at: isoMinusHours(2),
      frequencies_imported_at: isoMinusHours(2),
      navaids_imported_at: isoMinusHours(2),
    },
  }, calls);
  const result = await runRefreshStepWithLock({
    env: { NEXT_PUBLIC_SUPABASE_URL: "https://x.test", SUPABASE_SERVICE_ROLE_KEY: "key" },
    createClientImpl: () => fakeClient,
    importerFactory: () => ({
      importTable: () => { throw new Error("should not import"); },
    }),
  });
  assert.deepEqual(result, { ran: false, reason: "fresh" });
}

// runRefreshStepWithLock: airports stale, lock acquired -> imports only airports
{
  const calls = [];
  const fakeClient = createFakeMetaClient({
    selectData: {
      airports_imported_at: isoMinusHours(48),
      runways_imported_at: isoMinusHours(2),
      frequencies_imported_at: isoMinusHours(2),
      navaids_imported_at: isoMinusHours(2),
      last_attempted_at: null,
    },
    updateRowCount: 1,
  }, calls);
  const importerCalls = [];
  const importer = {
    importTable: async (key) => {
      importerCalls.push(key);
      return 85000;
    },
  };
  const result = await runRefreshStepWithLock({
    env: { NEXT_PUBLIC_SUPABASE_URL: "https://x.test", SUPABASE_SERVICE_ROLE_KEY: "key" },
    createClientImpl: () => fakeClient,
    importerFactory: () => importer,
  });
  assert.deepEqual(result, { ran: true, table: "airports", count: 85000 });
  assert.deepEqual(importerCalls, ["airports"]);
  const updates = calls.filter((c) => c.kind === "update");
  assert.equal(updates.length, 2);
  assert.ok(updates[0].values.last_status.startsWith("in_progress:airports"));
  assert.equal(updates[1].values.last_status, "success");
  assert.equal(updates[1].values.airports_count, 85000);
  assert.ok(updates[1].values.airports_imported_at);
}

// runRefreshStepWithLock: lock held by another in-progress run -> skip
{
  const calls = [];
  const fakeClient = createFakeMetaClient({
    selectData: {
      airports_imported_at: isoMinusHours(48),
      last_attempted_at: isoMinusHours(0.05),
      last_status: "in_progress:airports",
    },
  }, calls);
  const result = await runRefreshStepWithLock({
    env: { NEXT_PUBLIC_SUPABASE_URL: "https://x.test", SUPABASE_SERVICE_ROLE_KEY: "key" },
    createClientImpl: () => fakeClient,
    importerFactory: () => ({
      importTable: () => { throw new Error("should not import when locked"); },
    }),
  });
  assert.deepEqual(result, { ran: false, reason: "locked" });
}

// runRefreshStepWithLock: importer failure -> records error and rethrows
{
  const calls = [];
  const fakeClient = createFakeMetaClient({
    selectData: { airports_imported_at: isoMinusHours(48), last_attempted_at: null },
    updateRowCount: 1,
  }, calls);
  await assert.rejects(
    runRefreshStepWithLock({
      env: { NEXT_PUBLIC_SUPABASE_URL: "https://x.test", SUPABASE_SERVICE_ROLE_KEY: "key" },
      createClientImpl: () => fakeClient,
      importerFactory: () => ({
        importTable: async () => { throw new Error("network down"); },
      }),
    }),
    /network down/,
  );
  const updates = calls.filter((c) => c.kind === "update");
  assert.ok(updates[0].values.last_status.startsWith("in_progress:airports"));
  assert.ok(updates[1].values.last_status.startsWith("error:airports"));
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
