import assert from "node:assert/strict";

import {
  NEARBY_AIRPORT_SUPABASE_CACHE_TTL_MS,
  buildNearbyAirportCacheKey,
  createNearbyAirportSupabaseCache,
  createNearbyAirportSupabaseCacheFromEnv,
} from "./nearbyAirports.dao.js";

const now = () => Date.parse("2026-05-10T12:00:00.000Z");

function createFakeSupabaseClient({ readData = null, readError = null, writeError = null } = {}) {
  const calls = [];
  const createClientImpl = (supabaseUrl, supabaseKey, options) => {
    calls.push({ type: "createClient", supabaseUrl, supabaseKey, options });
    return {
      from(table) {
        calls.push({ type: "from", table });
        return {
          select(columns) {
            calls.push({ type: "select", columns });
            return this;
          },
          eq(column, value) {
            calls.push({ type: "eq", column, value });
            return this;
          },
          gt(column, value) {
            calls.push({ type: "gt", column, value });
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
          async upsert(row, options) {
            calls.push({ type: "upsert", row, options });
            return { error: writeError };
          },
        };
      },
    };
  };
  return { calls, createClientImpl };
}

assert.equal(NEARBY_AIRPORT_SUPABASE_CACHE_TTL_MS, 90 * 24 * 60 * 60 * 1000);

assert.equal(
  buildNearbyAirportCacheKey({
    lat: 40.6399284,
    lon: -73.7786918,
    icao: "kjfk",
    radiusNm: 30,
    limit: 6,
  }),
  "nearby-airports-v7:KJFK:40.639928:-73.778692:30:6",
);

{
  const { calls, createClientImpl } = createFakeSupabaseClient({
    readData: {
      response: { airports: [{ icao: "KLGA" }], source: "ourairports" },
      expires_at: "2026-08-08T12:00:00.000Z",
    },
  });
  const cache = createNearbyAirportSupabaseCache({
    supabaseUrl: "https://vqjvtpqryblqwrbsaxwb.supabase.co",
    supabaseKey: "sb_publishable_test",
    createClientImpl,
    now,
  });

  const payload = await cache.read("nearby-airports-v7:KJFK:40.639928:-73.778692:30:6");

  assert.deepEqual(payload, {
    airports: [{ icao: "KLGA" }],
    source: "ourairports",
  });
  assert.deepEqual(calls[0], {
    type: "createClient",
    supabaseUrl: "https://vqjvtpqryblqwrbsaxwb.supabase.co",
    supabaseKey: "sb_publishable_test",
    options: {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  });
  assert.deepEqual(
    calls.filter((call) => call.type !== "createClient"),
    [
      { type: "from", table: "nearby_airport_cache" },
      { type: "select", columns: "response,expires_at" },
      {
        type: "eq",
        column: "cache_key",
        value: "nearby-airports-v7:KJFK:40.639928:-73.778692:30:6",
      },
      { type: "gt", column: "expires_at", value: "2026-05-10T12:00:00.000Z" },
      { type: "limit", count: 1 },
      { type: "maybeSingle" },
    ],
  );
}

{
  const { calls, createClientImpl } = createFakeSupabaseClient();
  const cache = createNearbyAirportSupabaseCache({
    supabaseUrl: "https://vqjvtpqryblqwrbsaxwb.supabase.co/",
    supabaseKey: "sb_publishable_test",
    createClientImpl,
    now,
  });

  await cache.write({
    cacheKey: "nearby-airports-v7:KJFK:40.639928:-73.778692:30:6",
    query: {
      icao: "KJFK",
      lat: 40.639928,
      lon: -73.778692,
      radiusNm: 30,
      limit: 6,
    },
    response: { airports: [{ icao: "KLGA" }], source: "ourairports" },
  });

  const upsertCall = calls.find((call) => call.type === "upsert");
  assert.equal(upsertCall.row.cache_key, "nearby-airports-v7:KJFK:40.639928:-73.778692:30:6");
  assert.equal(upsertCall.row.expires_at, "2026-08-08T12:00:00.000Z");
  assert.deepEqual(upsertCall.row.response.airports, [{ icao: "KLGA" }]);
  assert.deepEqual(upsertCall.options, { onConflict: "cache_key" });
}

assert.equal(
  createNearbyAirportSupabaseCache({
    supabaseUrl: "",
    supabaseKey: "sb_publishable_test",
    createClientImpl: () => ({}),
  }),
  null,
);

{
  const { calls, createClientImpl } = createFakeSupabaseClient();
  const cache = createNearbyAirportSupabaseCacheFromEnv({
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://vqjvtpqryblqwrbsaxwb.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    },
    createClientImpl,
    now,
  });

  await cache.read("cache-key");
  assert.equal(calls[0].supabaseKey, "sb_publishable_test");
}
