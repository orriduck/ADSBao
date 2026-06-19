import assert from "node:assert/strict";

import { createRouteFeedbackReportsRepositoryFromEnv } from "./routeFeedbackReports.dao";

const now = () => Date.parse("2026-05-17T00:00:00.000Z");

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
  const overrideRow = {
    id: "abc",
    cache_key: "AAL1234|KBOS|BOS",
    normalized_callsign: "AAL1234",
    route_payload: { origin: { icao: "KJFK" }, destination: { icao: "KBOS" } },
    expires_at: "2026-05-17T12:00:00.000Z",
  };
  const { calls, queryClient } = createFakePostgresClient([{ rows: [overrideRow] }]);
  const repo = createRouteFeedbackReportsRepositoryFromEnv({
    queryClient,
    now,
  });

  const row = await repo.readActiveOverride({
    normalizedCallsign: "AAL1234",
  });

  assert.equal(row, overrideRow);
  assert.match(
    normalizeSql(calls[0].text),
    /from runtime\.flight_route_feedback_reports where normalized_callsign = \$1 and status = \$2 and deleted_at is null and expires_at > \$3 order by created_at desc limit 1/i,
  );
  assert.deepEqual(calls[0].values, [
    "AAL1234",
    "active",
    "2026-05-17T00:00:00.000Z",
  ]);
}

{
  const { calls, queryClient } = createFakePostgresClient();
  const repo = createRouteFeedbackReportsRepositoryFromEnv({
    queryClient,
    now,
  });

  assert.equal(await repo.readActiveOverride({ normalizedCallsign: "" }), null);
  assert.equal(calls.length, 0);
}

{
  const insertedRow = {
    id: "f00",
    cache_key: "AAL1234|KBOS|BOS",
    normalized_callsign: "AAL1234",
    target_airport_icao: "KBOS",
    target_airport_iata: "BOS",
    origin_icao: "KJFK",
    destination_icao: "KBOS",
    feedback_reason: "missing_route",
    status: "active",
    created_at: "2026-05-17T00:00:00.000Z",
    expires_at: "2026-05-17T12:00:00.000Z",
  };
  const { calls, queryClient } = createFakePostgresClient([{ rows: [insertedRow] }]);
  const repo = createRouteFeedbackReportsRepositoryFromEnv({
    queryClient,
    now,
  });

  const result = await repo.writeFeedbackReport({
    cacheKey: "AAL1234|KBOS|BOS",
    normalizedCallsign: "AAL1234",
    targetAirportIcao: "KBOS",
    targetAirportIata: "BOS",
    originIcao: "KJFK",
    destinationIcao: "KBOS",
    aircraftHex: "a1b2c3",
    aircraftType: "A321",
    feedbackReason: "missing_route",
    priorRoutePayload: null,
    routePayload: { origin: { icao: "KJFK" }, destination: { icao: "KBOS" } },
    createdAt: "2026-05-17T00:00:00.000Z",
    expiresAt: "2026-05-17T12:00:00.000Z",
  });

  assert.equal(result, insertedRow);
  assert.match(
    normalizeSql(calls[0].text),
    /^insert into runtime\.flight_route_feedback_reports/i,
  );
  assert.deepEqual(calls[0].values.slice(0, 5), [
    "AAL1234|KBOS|BOS",
    "AAL1234",
    "KBOS",
    "BOS",
    "KJFK",
  ]);
  assert.equal(calls[0].values[12], "active");
  assert.equal(calls[0].values[15], null);
}

{
  const { queryClient } = createFakePostgresClient([{ error: "permission denied" }]);
  const repo = createRouteFeedbackReportsRepositoryFromEnv({ queryClient, now });
  await assert.rejects(
    () => repo.readActiveOverride({ normalizedCallsign: "AAL1234" }),
    /Route feedback override read failed \(permission denied\)/,
  );
}

assert.equal(createRouteFeedbackReportsRepositoryFromEnv({ env: {} }), null);

console.log("routeFeedbackReports.dao.test.ts ok");
