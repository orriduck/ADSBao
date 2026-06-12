import assert from "node:assert/strict";

import { createAirportNameRepositoryFromEnv } from "./airportNames.dao";

const AIRPORTS_TABLE = "airports";

function createFakeSupabaseClient(tableData: Record<string, any[]> = {}) {
  const calls: Array<Record<string, any>> = [];

  const createQuery = (table: string) => {
    const query: Record<string, any> = {
      select(columns: string) {
        calls.push({ type: "select", table, columns });
        return query;
      },
      or(filter: string) {
        calls.push({ type: "or", table, filter });
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

const repositoryWith = (rows: any[], createClientImpl: any) =>
  createAirportNameRepositoryFromEnv({
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SECRET_KEY: "sb_secret_test",
    },
    createClientImpl,
  });

// readNamesByIdents builds an ICAO/ident-keyed Map and skips empty names.
{
  const { calls, createClientImpl } = createFakeSupabaseClient({
    [AIRPORTS_TABLE]: [
      {
        ident: "KBOS",
        icao_code: "KBOS",
        iata_code: "BOS",
        name: "General Edward Lawrence Logan International Airport",
        municipality: "Boston",
      },
      // Empty-name row is dropped entirely.
      { ident: "KZZZ", icao_code: "KZZZ", iata_code: "", name: "   ", municipality: "" },
    ],
  });
  const repository = repositoryWith([], createClientImpl);

  const byIdent = await repository.readNamesByIdents([" kbos ", "kzzz"]);

  assert.equal(byIdent.size, 1);
  assert.deepEqual(byIdent.get("KBOS"), {
    name: "General Edward Lawrence Logan International Airport",
    city: "Boston",
  });
  // The query selects from the airports table and filters by both columns.
  const orCall = calls.find((call) => call.type === "or");
  assert.ok(orCall, "expected an or() filter call");
  assert.equal(orCall.filter, "icao_code.in.(KBOS,KZZZ),ident.in.(KBOS,KZZZ)");
}

// Empty input short-circuits without touching the client.
{
  const { calls, createClientImpl } = createFakeSupabaseClient();
  const repository = repositoryWith([], createClientImpl);
  const byIdent = await repository.readNamesByIdents([]);
  assert.equal(byIdent.size, 0);
  assert.ok(!calls.some((call) => call.type === "from"), "should not query on empty input");
}

// getNameByIdent resolves a single normalized identifier.
{
  const { createClientImpl } = createFakeSupabaseClient({
    [AIRPORTS_TABLE]: [
      { ident: "EGLL", icao_code: "EGLL", iata_code: "LHR", name: "London Heathrow Airport", municipality: "London" },
    ],
  });
  const repository = repositoryWith([], createClientImpl);
  const match = await repository.getNameByIdent("egll");
  assert.deepEqual(match, { name: "London Heathrow Airport", city: "London" });
}

console.log("airportNames.dao.test.ts passed");
