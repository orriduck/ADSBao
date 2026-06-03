import assert from "node:assert/strict";

import {
  OPENAIP_AIRSPACES_TABLE,
  createAirspaceContextRepository,
  createAirspaceContextRepositoryFromEnv,
} from "./airspaceContext.dao";

const sampleAirspacePayload = {
  _id: "asp-1",
  name: "BEDFORD CLASS D",
  type: 2,
  icaoClass: 3,
  country: "US",
  lowerLimit: { value: 0, unit: 1, referenceDatum: 1 },
  upperLimit: { value: 2500, unit: 1, referenceDatum: 1 },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [-71.4, 42.3],
        [-71.1, 42.3],
        [-71.1, 42.6],
        [-71.4, 42.6],
        [-71.4, 42.3],
      ],
    ],
  },
};

function createFakeSupabaseClient({
  rpcData = {},
  tableData = {},
}: {
  rpcData?: Record<string, any>;
  tableData?: Record<string, any[]>;
} = {}) {
  const calls: Array<Record<string, any>> = [];

  const createQuery = (table: string) => {
    const query: Record<string, any> = {
      select(columns: string) {
        calls.push({ type: "select", table, columns });
        return query;
      },
      in(column: string, values: unknown[]) {
        calls.push({ type: "in", table, column, values });
        return query;
      },
      limit(count: number) {
        calls.push({ type: "limit", table, count });
        return query;
      },
      then(resolve: (value: any) => void) {
        return Promise.resolve({
          data: tableData[table] || [],
          error: null,
        }).then(resolve);
      },
    };
    return query;
  };

  const createClientImpl = (supabaseUrl: string, supabaseKey: string, options: any) => {
    calls.push({ type: "createClient", supabaseUrl, supabaseKey, options });
    return {
      rpc(name: string, args: Record<string, any>) {
        calls.push({ type: "rpc", name, args });
        return Promise.resolve({ data: rpcData[name], error: null });
      },
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
    rpcData: {
      get_openaip_airspaces_in_bbox: [
        {
          openaip_id: "asp-1",
          payload: sampleAirspacePayload,
        },
      ],
    },
  });
  const repository = createAirspaceContextRepository({
    supabaseUrl: "https://example.supabase.co",
    supabaseKey: "sb_secret_test",
    createClientImpl,
  });

  const airspaces = await repository.readAirspacesInBounds({
    bbox: { west: -72, south: 42, east: -70, north: 43 },
    limit: 200,
  });

  assert.equal(airspaces.length, 1);
  assert.equal(airspaces[0].id, "asp-1");
  assert.equal(airspaces[0].source, "openaip");
  assert.deepEqual(calls[1], {
    type: "rpc",
    name: "get_openaip_airspaces_in_bbox",
    args: {
      p_west: -72,
      p_south: 42,
      p_east: -70,
      p_north: 43,
      p_limit: 200,
    },
  });
}

{
  const { calls, createClientImpl } = createFakeSupabaseClient({
    rpcData: {
      get_full_trace_airspace_stats: {
        tracePointCount: 2,
        airspaceIds: ["asp-1"],
        regions: [
          {
            osmId: 61315,
            name: "Massachusetts",
            navaidCount: 28,
            airspaceCount: 57,
            airspaceIds: ["asp-1"],
          },
        ],
      },
    },
    tableData: {
      [OPENAIP_AIRSPACES_TABLE]: [
        {
          openaip_id: "asp-1",
          payload: sampleAirspacePayload,
        },
      ],
    },
  });
  const repository = createAirspaceContextRepository({
    supabaseUrl: "https://example.supabase.co",
    supabaseKey: "sb_secret_test",
    createClientImpl,
  });

  const context = await repository.readFullTraceAirspaceContext({
    tracePoints: [
      { lat: 42.36, lon: -71, timestampMs: 1 },
      { lat: 42.42, lon: -71.2, timestampMs: 2 },
      { lat: 999, lon: -71.2 },
    ],
  });

  assert.equal(context.source, "supabase");
  assert.equal(context.tracePointCount, 2);
  assert.deepEqual(context.airspaceIds, ["asp-1"]);
  assert.equal(context.airspaces.length, 1);
  assert.equal(context.regions[0].osmId, 61315);
  assert.deepEqual(calls.slice(1, 5), [
    {
      type: "rpc",
      name: "get_full_trace_airspace_stats",
      args: {
        p_trace_points: [
          { latitude: 42.36, longitude: -71, timestamp_ms: 1 },
          { latitude: 42.42, longitude: -71.2, timestamp_ms: 2 },
        ],
        p_limit: 250,
      },
    },
    { type: "from", table: OPENAIP_AIRSPACES_TABLE },
    {
      type: "select",
      table: OPENAIP_AIRSPACES_TABLE,
      columns: "openaip_id,payload",
    },
    {
      type: "in",
      table: OPENAIP_AIRSPACES_TABLE,
      column: "openaip_id",
      values: ["asp-1"],
    },
  ]);
}

{
  const { calls, createClientImpl } = createFakeSupabaseClient();
  const repository = createAirspaceContextRepositoryFromEnv({
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "sb_service_role_test",
    },
    createClientImpl,
  });

  assert.ok(repository);
  assert.equal(calls[0].supabaseKey, "sb_service_role_test");
}

console.log("airspaceContext.dao.test.ts ok");
