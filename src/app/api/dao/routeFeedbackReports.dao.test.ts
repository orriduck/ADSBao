import assert from "node:assert/strict";

import {
  ROUTE_FEEDBACK_TABLE,
  createRouteFeedbackReportsRepository,
  createRouteFeedbackReportsRepositoryFromEnv,
} from "./routeFeedbackReports.dao";

const now = () => Date.parse("2026-05-17T00:00:00.000Z");

function createFakeSupabaseClient({
  readData = null,
  readError = null,
  writeData = null,
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
          select(columns) {
            calls.push({ type: "select", columns });
            return this;
          },
          eq(column, value) {
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
            return { data: readData, error: readError };
          },
          async single() {
            calls.push({ type: "single" });
            return { data: writeData ?? builder.insertedRow, error: writeError };
          },
          insert(row) {
            builder.insertedRow = row;
            calls.push({ type: "insert", row });
            return this;
          },
        };
        return builder;
      },
    };
  };
  return { calls, createClientImpl };
}

assert.equal(ROUTE_FEEDBACK_TABLE, "flight_route_feedback_reports");

// readActiveOverride filters by callsign + status + non-expired +
// non-deleted, returning the newest match. cache_key is intentionally NOT
// in the where clause: a correction submitted from an airport context
// (cache_key = "AAL1234|KBOS|BOS") should also apply on the flight page
// where the lookup has no airport context.
{
  const overrideRow = {
    id: "abc",
    cache_key: "AAL1234|KBOS|BOS",
    normalized_callsign: "AAL1234",
    route_payload: { origin: { icao: "KJFK" }, destination: { icao: "KBOS" } },
    expires_at: "2026-05-17T12:00:00.000Z",
  };
  const { calls, createClientImpl } = createFakeSupabaseClient({
    readData: overrideRow,
  });
  const repo = createRouteFeedbackReportsRepository({
    supabaseUrl: "https://example.supabase.co",
    supabaseKey: "sb_secret_test",
    createClientImpl,
    now,
  });

  const row = await repo.readActiveOverride({
    normalizedCallsign: "AAL1234",
  });

  assert.equal(row, overrideRow);
  assert.deepEqual(
    calls.filter((call) => call.type !== "createClient"),
    [
      { type: "from", table: ROUTE_FEEDBACK_TABLE },
      {
        type: "select",
        columns:
          "id,cache_key,normalized_callsign,target_airport_icao,target_airport_iata,origin_icao,destination_icao,aircraft_hex,aircraft_type,feedback_reason,prior_route_payload,route_payload,status,created_at,expires_at,deleted_at",
      },
      { type: "eq", column: "normalized_callsign", value: "AAL1234" },
      { type: "eq", column: "status", value: "active" },
      { type: "is", column: "deleted_at", value: null },
      { type: "gt", column: "expires_at", value: "2026-05-17T00:00:00.000Z" },
      { type: "order", column: "created_at", options: { ascending: false } },
      { type: "limit", count: 1 },
      { type: "maybeSingle" },
    ],
  );
}

// Missing callsign returns null without hitting the network.
{
  const { calls, createClientImpl } = createFakeSupabaseClient();
  const repo = createRouteFeedbackReportsRepository({
    supabaseUrl: "https://example.supabase.co",
    supabaseKey: "sb_secret_test",
    createClientImpl,
    now,
  });

  assert.equal(
    await repo.readActiveOverride({ normalizedCallsign: "" }),
    null,
  );
  assert.equal(
    calls.filter((call) => call.type !== "createClient").length,
    0,
  );
}

// writeFeedbackReport persists the full row with the supplied expiry and
// emits an active, non-deleted record so it is immediately discoverable by
// readActiveOverride.
{
  const insertedRow = {
    id: "f00",
    cache_key: "AAL1234|KBOS|BOS",
    normalized_callsign: "AAL1234",
    target_airport_icao: "KBOS",
    target_airport_iata: "BOS",
    origin_icao: "KJFK",
    destination_icao: "KBOS",
    feedback_reason: "missing_route",
    status: "active",
    created_at: "2026-05-17T00:00:00.000Z",
    expires_at: "2026-05-17T12:00:00.000Z",
  };
  const { calls, createClientImpl } = createFakeSupabaseClient({
    writeData: insertedRow,
  });
  const repo = createRouteFeedbackReportsRepository({
    supabaseUrl: "https://example.supabase.co",
    supabaseKey: "sb_secret_test",
    createClientImpl,
    now,
  });

  const result = await repo.writeFeedbackReport({
    cacheKey: "AAL1234|KBOS|BOS",
    normalizedCallsign: "AAL1234",
    targetAirportIcao: "KBOS",
    targetAirportIata: "BOS",
    originIcao: "KJFK",
    destinationIcao: "KBOS",
    aircraftHex: "a1b2c3",
    aircraftType: "A321",
    feedbackReason: "missing_route",
    priorRoutePayload: null,
    routePayload: { origin: { icao: "KJFK" }, destination: { icao: "KBOS" } },
    createdAt: "2026-05-17T00:00:00.000Z",
    expiresAt: "2026-05-17T12:00:00.000Z",
  });

  assert.equal(result, insertedRow);
  const insertCall = calls.find((call) => call.type === "insert");
  assert.equal(insertCall.row.cache_key, "AAL1234|KBOS|BOS");
  assert.equal(insertCall.row.normalized_callsign, "AAL1234");
  assert.equal(insertCall.row.target_airport_icao, "KBOS");
  assert.equal(insertCall.row.origin_icao, "KJFK");
  assert.equal(insertCall.row.destination_icao, "KBOS");
  assert.equal(insertCall.row.aircraft_hex, "a1b2c3");
  assert.equal(insertCall.row.aircraft_type, "A321");
  assert.equal(insertCall.row.feedback_reason, "missing_route");
  assert.equal(insertCall.row.status, "active");
  assert.equal(insertCall.row.deleted_at, null);
  assert.equal(insertCall.row.expires_at, "2026-05-17T12:00:00.000Z");
  assert.equal(insertCall.row.created_at, "2026-05-17T00:00:00.000Z");
  assert.deepEqual(insertCall.row.route_payload, {
    origin: { icao: "KJFK" },
    destination: { icao: "KBOS" },
  });
}

// fromEnv prefers the secret key so the server-side handler can insert with
// service-role privileges even though the publishable key is the public
// browser default everywhere else.
{
  const { calls, createClientImpl } = createFakeSupabaseClient();
  const repo = createRouteFeedbackReportsRepositoryFromEnv({
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SECRET_KEY: "sb_secret_from_env",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_unused",
    },
    createClientImpl,
    now,
  });
  await repo.readActiveOverride({ normalizedCallsign: "AAL1234" });
  assert.equal(calls[0].supabaseKey, "sb_secret_from_env");
}

// Missing supabase config returns null instead of throwing — the handler
// degrades to "adsbdb only" rather than 500ing.
assert.equal(
  createRouteFeedbackReportsRepository({
    supabaseUrl: "",
    supabaseKey: "sb_secret",
    createClientImpl: () => ({}),
  }),
  null,
);
