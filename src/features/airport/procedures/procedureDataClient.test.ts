import assert from "node:assert/strict";

import {
  buildProcedureIndexPath,
  buildRunwayProceduresPath,
  createProcedureDataClient,
} from "./procedureDataClient";

assert.equal(
  buildProcedureIndexPath("kbos"),
  "/api/proxy/procedures/US/KBOS",
);
assert.equal(
  buildRunwayProceduresPath("kbos"),
  "/api/proxy/procedures/US/KBOS/runways",
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

  assert.equal(calls[0], "/api/proxy/procedures/US/KBOS");
  assert.deepEqual(index.approaches, [{ id: "one" }]);
}

{
  const client = createProcedureDataClient({
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      async json() {
        return {
          index: { airport: "KBOS", approaches: [{ id: "one" }] },
          geojson: { type: "FeatureCollection", features: [] },
        };
      },
    }),
  });

  const payload = await client.fetchLiveProcedures("kbos");

  assert.equal(payload.index.airport, "KBOS");
  assert.equal(payload.geojson.type, "FeatureCollection");
}

{
  const calls = [];
  const client = createProcedureDataClient({
    fetchImpl: async (url) => {
      calls.push(url);
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            airport: "KBOS",
            runwayDirections: [{ runway: "04R", approaches: [] }],
          };
        },
      };
    },
  });

  const payload = await client.fetchRunwayProcedures("kbos");

  assert.equal(calls[0], "/api/proxy/procedures/US/KBOS/runways");
  assert.equal(payload.airport, "KBOS");
  assert.equal(payload.runwayDirections[0].runway, "04R");
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
  assert.equal(await client.fetchLiveProcedures("kxyz"), null);
  assert.equal(await client.fetchRunwayProcedures("kxyz"), null);
}
