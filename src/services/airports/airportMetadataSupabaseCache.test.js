import assert from "node:assert/strict";

import {
  AIRPORT_METADATA_SUPABASE_CACHE_TTL_MS,
  createAirportMetadataSupabaseCache,
  createAirportMetadataSupabaseCacheFromEnv,
  normalizeAirportMetadataRow,
} from "./airportMetadataSupabaseCache.js";

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
          async upsert(rows, options) {
            calls.push({ type: "upsert", rows, options });
            return { error: writeError };
          },
        };
      },
    };
  };
  return { calls, createClientImpl };
}

assert.equal(AIRPORT_METADATA_SUPABASE_CACHE_TTL_MS, 90 * 24 * 60 * 60 * 1000);

assert.deepEqual(
  normalizeAirportMetadataRow({
    icao: "kbos",
    iata: "bos",
    name: "Boston Logan International Airport",
    city: "Boston",
    state: "MA",
    country: "us",
    type: "large_airport",
    type_label: "Large Airport",
    lat: "42.3656",
    lon: "-71.0096",
    elevationFt: "20",
    source: "ourairports",
  }),
  {
    airport_key: "KBOS",
    icao: "KBOS",
    iata: "BOS",
    code: "KBOS",
    name: "Boston Logan International Airport",
    city: "Boston",
    state: "MA",
    country: "US",
    type: "large_airport",
    type_label: "Large Airport",
    lat: 42.3656,
    lon: -71.0096,
    elevation_ft: 20,
    source: "ourairports",
    metadata: {},
  },
);

{
  const { calls, createClientImpl } = createFakeSupabaseClient({
    readData: {
      airport_key: "KBOS",
      icao: "KBOS",
      iata: "BOS",
      code: "KBOS",
      name: "Boston Logan International Airport",
      city: "Boston",
      state: "MA",
      country: "US",
      type: "large_airport",
      type_label: "Large Airport",
      lat: 42.3656,
      lon: -71.0096,
      elevation_ft: 20,
      source: "ourairports",
      metadata: {},
      expires_at: "2026-08-08T12:00:00.000Z",
    },
  });
  const cache = createAirportMetadataSupabaseCache({
    supabaseUrl: "https://vqjvtpqryblqwrbsaxwb.supabase.co",
    supabaseKey: "sb_publishable_test",
    createClientImpl,
    now,
  });

  const airport = await cache.read("kbos");

  assert.deepEqual(airport, {
    icao: "KBOS",
    iata: "BOS",
    code: "KBOS",
    name: "Boston Logan International Airport",
    city: "Boston",
    state: "MA",
    country: "US",
    type: "large_airport",
    type_label: "Large Airport",
    lat: 42.3656,
    lon: -71.0096,
    elevationFt: 20,
    source: "ourairports",
  });
  assert.deepEqual(
    calls.filter((call) => call.type !== "createClient"),
    [
      { type: "from", table: "airport_metadata_cache" },
      {
        type: "select",
        columns:
          "airport_key,icao,iata,code,name,city,state,country,type,type_label,lat,lon,elevation_ft,source,metadata,expires_at",
      },
      { type: "eq", column: "airport_key", value: "KBOS" },
      { type: "gt", column: "expires_at", value: "2026-05-10T12:00:00.000Z" },
      { type: "limit", count: 1 },
      { type: "maybeSingle" },
    ],
  );
}

{
  const { calls, createClientImpl } = createFakeSupabaseClient();
  const cache = createAirportMetadataSupabaseCache({
    supabaseUrl: "https://vqjvtpqryblqwrbsaxwb.supabase.co",
    supabaseKey: "sb_publishable_test",
    createClientImpl,
    now,
  });

  await cache.writeMany([
    {
      icao: "KJFK",
      iata: "JFK",
      name: "John F Kennedy International Airport",
      city: "New York",
      country: "US",
      lat: 40.639928,
      lon: -73.778692,
      source: "airac.net",
    },
    {
      icao: "",
      name: "",
    },
  ]);

  const upsertCall = calls.find((call) => call.type === "upsert");
  assert.equal(upsertCall.rows.length, 1);
  assert.equal(upsertCall.rows[0].airport_key, "KJFK");
  assert.equal(upsertCall.rows[0].expires_at, "2026-08-08T12:00:00.000Z");
  assert.equal(upsertCall.rows[0].lat, 40.639928);
  assert.equal(upsertCall.rows[0].lon, -73.778692);
  assert.deepEqual(upsertCall.options, { onConflict: "airport_key" });
}

assert.equal(
  createAirportMetadataSupabaseCacheFromEnv({
    env: {},
    createClientImpl: () => ({}),
  }),
  null,
);
