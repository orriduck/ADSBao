import assert from "node:assert/strict";

import { createAirportFacilityRepositoryFromEnv } from "./airportFacilities.dao";

function createFakePostgresClient(responses: Array<Record<string, any>> = []) {
  const calls: Array<Record<string, any>> = [];
  return {
    calls,
    queryClient: {
      async query(text: string, values: unknown[] = []) {
        calls.push({ text, values });
        const response = responses.shift() || {};
        if (response.error) throw new Error(response.error);
        const rows = response.rows || [];
        return { rows, rowCount: response.rowCount ?? rows.length };
      },
    },
  };
}

const normalizeSql = (sql: string) => sql.replace(/\s+/g, " ").trim();

{
  const { calls, queryClient } = createFakePostgresClient([
    {
      rows: [
        {
          id: 1,
          airport_ident: "KBOS",
          type: "TWR",
          description: "BOSTON TOWER",
          frequency_mhz: 128.8,
        },
      ],
    },
  ]);
  const repository = createAirportFacilityRepositoryFromEnv({ queryClient });

  const frequencies: any[] = await repository.readFrequenciesByAirportIdent(" kbos ");

  assert.equal(frequencies.length, 1);
  assert.equal(frequencies[0].airportIdent, "KBOS");
  assert.equal(frequencies[0].source, "ourairports");
  assert.match(
    normalizeSql(calls[0].text),
    /from ourairports\.airport_frequencies where airport_ident = \$1 order by type asc, frequency_mhz asc/i,
  );
  assert.deepEqual(calls[0].values, ["KBOS"]);
}

{
  const { calls, queryClient } = createFakePostgresClient([
    {
      rows: [
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
    },
  ]);
  const repository = createAirportFacilityRepositoryFromEnv({ queryClient });

  const navaids: any[] = await repository.readNavaidsNearAirport({
    lat: 42.3656,
    lon: -71.0096,
    radiusNm: 60,
    limit: 50,
  });

  assert.equal(navaids.length, 1);
  assert.equal(navaids[0].ident, "BOS");
  assert.equal(navaids[0].source, "ourairports");
  assert.match(normalizeSql(calls[0].text), /from ourairports\.navaids/i);
  assert.match(normalizeSql(calls[0].text), /limit \$5/i);
  assert.equal(calls[0].values[4], 50);
}

{
  const { calls, queryClient } = createFakePostgresClient([{ rows: [{ count: "37" }] }]);
  const repository = createAirportFacilityRepositoryFromEnv({ queryClient });

  const count = await repository.readNavaidCountInBounds({
    bbox: {
      south: 36.597889,
      north: 40.979898,
      west: -78.75,
      east: -73.125,
    },
  });

  assert.equal(count, 37);
  assert.match(
    normalizeSql(calls[0].text),
    /select count\(\*\)::int as count from ourairports\.navaids/i,
  );
}

{
  const { queryClient } = createFakePostgresClient([{ error: "permission denied" }]);
  const repository = createAirportFacilityRepositoryFromEnv({ queryClient });
  await assert.rejects(
    () => repository.readFrequenciesByAirportIdent("KBOS"),
    /Airport frequencies read failed \(permission denied\)/,
  );
}

assert.equal(createAirportFacilityRepositoryFromEnv({ env: {} }), null);

console.log("airportFacilities.dao.test.ts ok");
