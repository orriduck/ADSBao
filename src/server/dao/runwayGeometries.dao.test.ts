import assert from "node:assert/strict";

import { createRunwayGeometryRepositoryFromEnv } from "./runwayGeometries.dao";

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
      lookup_ident: "BOS",
      source: "ourairports",
      source_id: "123",
      airport_ident: "KBOS",
      length_ft: 10000,
      width_ft: 150,
      surface: "ASP",
      lighted: true,
      closed: false,
      le_ident: "04L",
      he_ident: "22R",
    },
  ]);
  const repository = createRunwayGeometryRepositoryFromEnv({ queryClient });

  const byAirport = await repository.readByAirportIdents([" bos ", "BOS"]);

  assert.equal(byAirport.get("BOS").length, 1);
  assert.equal(byAirport.get("BOS")[0].le.ident, "04L");
  assert.match(
    normalizeSql(calls[0].text),
    /from aviation\.airport_aliases aliases join aviation\.airports airports on airports\.ident = aliases\.airport_ident join ourairports\.runway_geometries runway_geometries on runway_geometries\.airport_ident = airports\.ourairports_ident where aliases\.alias_ident = any\(\$1::text\[\]\) and runway_geometries\.source = \$2 order by aliases\.alias_ident asc, runway_geometries\.airport_ident asc, runway_geometries\.le_ident asc/i,
  );
  assert.deepEqual(calls[0].values, [["BOS"], "ourairports"]);
}

{
  const { calls, queryClient } = createFakePostgresClient();
  const repository = createRunwayGeometryRepositoryFromEnv({ queryClient });
  const byAirport = await repository.readByAirportIdents([]);
  assert.equal(byAirport.size, 0);
  assert.equal(calls.length, 0);
}

assert.equal(createRunwayGeometryRepositoryFromEnv({ env: {} }), null);

console.log("runwayGeometries.dao.test.ts ok");
