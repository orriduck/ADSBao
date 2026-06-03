import assert from "node:assert/strict";

import {
  AIRPORT_FREQUENCIES_TABLE,
  NAVAIDS_TABLE,
  createAirportFacilityRepository,
  createAirportFacilityRepositoryFromEnv,
} from "./airportFacilities.dao";

function createFakeSupabaseClient(tableData: Record<string, any[]> = {}) {
  const calls: Array<Record<string, any>> = [];

  const createQuery = (table: string) => {
    const query: Record<string, any> = {
      select(columns: string) {
        calls.push({ type: "select", table, columns });
        return query;
      },
      eq(column: string, value: unknown) {
        calls.push({ type: "eq", table, column, value });
        return query;
      },
      gte(column: string, value: unknown) {
        calls.push({ type: "gte", table, column, value });
        return query;
      },
      lte(column: string, value: unknown) {
        calls.push({ type: "lte", table, column, value });
        return query;
      },
      order(column: string, options: Record<string, any>) {
        calls.push({ type: "order", table, column, options });
        return query;
      },
      limit(count: number) {
        calls.push({ type: "limit", table, count });
        return query;
      },
      then(resolve: (value: any) => void) {
        return Promise.resolve({ data: tableData[table] || [], error: null }).then(resolve);
      },
    };
    return query;
  };

  const createClientImpl = (supabaseUrl: string, supabaseKey: string, options: any) => {
    calls.push({ type: "createClient", supabaseUrl, supabaseKey, options });
    return {
      from(table: string) {
        calls.push({ type: "from", table });
        return createQuery(table);
      },
    };
  };

  return { calls, createClientImpl };
}

{
  const { calls, createClientImpl } = createFakeSupabaseClient({
    [AIRPORT_FREQUENCIES_TABLE]: [
      {
        id: 1,
        airport_ident: "KBOS",
        type: "TWR",
        description: "BOSTON TOWER",
        frequency_mhz: 128.8,
      },
    ],
  });
  const repository = createAirportFacilityRepository({
    supabaseUrl: "https://example.supabase.co",
    supabaseKey: "sb_secret_test",
    createClientImpl,
  });

  const frequencies = await repository.readFrequenciesByAirportIdent(" kbos ");

  assert.equal(frequencies.length, 1);
  assert.equal(frequencies[0].airportIdent, "KBOS");
  assert.equal(frequencies[0].source, "ourairports");
  assert.deepEqual(calls.slice(1), [
    { type: "from", table: AIRPORT_FREQUENCIES_TABLE },
    {
      type: "select",
      table: AIRPORT_FREQUENCIES_TABLE,
      columns: "id,airport_ref,airport_ident,type,description,frequency_mhz",
    },
    {
      type: "eq",
      table: AIRPORT_FREQUENCIES_TABLE,
      column: "airport_ident",
      value: "KBOS",
    },
    {
      type: "order",
      table: AIRPORT_FREQUENCIES_TABLE,
      column: "type",
      options: { ascending: true },
    },
    {
      type: "order",
      table: AIRPORT_FREQUENCIES_TABLE,
      column: "frequency_mhz",
      options: { ascending: true },
    },
  ]);
}

{
  const { calls, createClientImpl } = createFakeSupabaseClient({
    [NAVAIDS_TABLE]: [
      {
        id: 86260,
        ident: "BOS",
        name: "BOSTON",
        type: "VOR-DME",
        frequency_khz: 112700,
        latitude_deg: 42.3576,
        longitude_deg: -70.9896,
      },
    ],
  });
  const repository = createAirportFacilityRepository({
    supabaseUrl: "https://example.supabase.co",
    supabaseKey: "sb_secret_test",
    createClientImpl,
  });

  const navaids = await repository.readNavaidsNearAirport({
    lat: 42.3656,
    lon: -71.0096,
    radiusNm: 60,
    limit: 50,
  });

  assert.equal(navaids.length, 1);
  assert.equal(navaids[0].ident, "BOS");
  assert.equal(navaids[0].source, "ourairports");
  assert.ok(calls.some((call) => call.type === "gte" && call.column === "latitude_deg"));
  assert.ok(calls.some((call) => call.type === "lte" && call.column === "longitude_deg"));
  assert.ok(calls.some((call) => call.type === "limit" && call.count === 50));
}

{
  const { calls, createClientImpl } = createFakeSupabaseClient();
  const repository = createAirportFacilityRepositoryFromEnv({
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "sb_service_role_test",
    },
    createClientImpl,
  });

  assert.ok(repository);
  assert.equal(calls[0].supabaseKey, "sb_service_role_test");
}

console.log("airportFacilities.dao.test.ts ok");
