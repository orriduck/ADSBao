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

  const byAirport = await repository.readByAirportIdents([" kbos ", "KBOS"]);

  assert.equal(byAirport.get("KBOS").length, 1);
  assert.equal(byAirport.get("KBOS")[0].le.ident, "04L");
  assert.match(
    normalizeSql(calls[0].text),
    /from ourairports\.runway_geometries where source = \$1 and airport_ident = any\(\$2::text\[\]\) order by airport_ident asc, le_ident asc/i,
  );
  assert.deepEqual(calls[0].values, ["ourairports", ["KBOS"]]);
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
