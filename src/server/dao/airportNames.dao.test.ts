import assert from "node:assert/strict";

import { createAirportNameRepositoryFromEnv } from "./airportNames.dao";

function createFakePostgresClient(rows: any[] = []) {
  const calls: Array<Record<string, any>> = [];
  return {
    calls,
    queryClient: {
      async query(text: string, values: unknown[] = []) {
        calls.push({ text, values });
        return { rows, rowCount: rows.length };
      },
    },
  };
}

const normalizeSql = (sql: string) => sql.replace(/\s+/g, " ").trim();

{
  const { calls, queryClient } = createFakePostgresClient([
    {
      alias_ident: "KBOS",
      ident: "KBOS",
      icao_code: "KBOS",
      iata_code: "BOS",
      name: "General Edward Lawrence Logan International Airport",
      municipality: "Boston",
    },
    { ident: "KZZZ", icao_code: "KZZZ", iata_code: "", name: "   ", municipality: "" },
    {
      alias_ident: "BOS",
      ident: "KBOS",
      icao_code: "KBOS",
      iata_code: "BOS",
      name: "General Edward Lawrence Logan International Airport",
      municipality: "Boston",
    },
  ]);
  const repository = createAirportNameRepositoryFromEnv({ queryClient });

  const byIdent = await repository.readNamesByIdents([" kbos ", "kzzz", "KBOS"]);

  assert.equal(byIdent.size, 2);
  assert.deepEqual(byIdent.get("KBOS"), {
    name: "General Edward Lawrence Logan International Airport",
    city: "Boston",
  });
  assert.deepEqual(byIdent.get("BOS"), byIdent.get("KBOS"));
  assert.match(
    normalizeSql(calls[0].text),
    /from aviation\.airport_aliases requested_aliases join aviation\.airports airports on airports\.ident = requested_aliases\.airport_ident join aviation\.airport_aliases returned_aliases on returned_aliases\.airport_ident = airports\.ident where requested_aliases\.alias_ident = any\(\$1::text\[\]\)/i,
  );
  assert.deepEqual(calls[0].values, [["KBOS", "KZZZ"]]);
}

{
  const { queryClient } = createFakePostgresClient([
    {
      alias_ident: "BOS",
      ident: "US-0001",
      icao_code: "",
      iata_code: "BOS",
      name: "General Edward Lawrence Logan International Airport",
      municipality: "Boston",
    },
  ]);
  const repository = createAirportNameRepositoryFromEnv({ queryClient });
  const byIdent = await repository.readNamesByIdents(["bos"]);
  assert.equal(
    byIdent.get("BOS")?.name,
    "General Edward Lawrence Logan International Airport",
  );
}

{
  const { calls, queryClient } = createFakePostgresClient();
  const repository = createAirportNameRepositoryFromEnv({ queryClient });
  const byIdent = await repository.readNamesByIdents([]);
  assert.equal(byIdent.size, 0);
  assert.equal(calls.length, 0);
}

{
  const { queryClient } = createFakePostgresClient([
    {
      ident: "EGLL",
      icao_code: "EGLL",
      iata_code: "LHR",
      name: "London Heathrow Airport",
      municipality: "London",
    },
  ]);
  const repository = createAirportNameRepositoryFromEnv({ queryClient });
  const match = await repository.getNameByIdent("egll");
  assert.deepEqual(match, { name: "London Heathrow Airport", city: "London" });
}

assert.equal(createAirportNameRepositoryFromEnv({ env: {} }), null);

console.log("airportNames.dao.test.ts passed");
