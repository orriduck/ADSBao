import assert from "node:assert/strict";

import {
  buildProcedureGeoJsonPath,
  buildProcedureIndexPath,
  createProcedureDataClient,
} from "./procedureDataClient.js";

assert.equal(
  buildProcedureIndexPath("kbos"),
  "/data/procedures/US/KBOS/index.json",
);
assert.equal(
  buildProcedureGeoJsonPath("kbos", "kbos-rnav-gps-rwy-04r"),
  "/data/procedures/US/KBOS/approaches/kbos-rnav-gps-rwy-04r.geojson",
);

{
  const calls = [];
  const client = createProcedureDataClient({
    fetchImpl: async (url) => {
      calls.push(url);
      return {
        ok: true,
        status: 200,
        async json() {
          return { airport: "KBOS", approaches: [{ id: "one" }] };
        },
      };
    },
  });

  const index = await client.fetchProcedureIndex("kbos");

  assert.equal(calls[0], "/data/procedures/US/KBOS/index.json");
  assert.deepEqual(index.approaches, [{ id: "one" }]);
}

{
  const client = createProcedureDataClient({
    fetchImpl: async () => ({
      ok: false,
      status: 404,
      async json() {
        return {};
      },
    }),
  });

  assert.equal(await client.fetchProcedureIndex("kxyz"), null);
  assert.equal(await client.fetchProcedureGeoJson("kxyz", "missing"), null);
}
