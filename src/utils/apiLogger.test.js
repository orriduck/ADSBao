import assert from "node:assert/strict";

import { formatAuditLogLine, withAuditLogging } from "./apiLogger.js";

const originalConsoleLog = console.log;
const logs = [];

console.log = (...args) => {
  logs.push(args);
};

try {
  assert.equal(
    formatAuditLogLine({
      endpointPath: "/api/proxy/flight-routes/callsign/DAL123",
      status: 200,
      durationMs: 14,
    }),
    "[audit:/api/proxy/flight-routes/callsign/DAL123]: 200 +14ms",
  );

  const okFetch = async () => ({ status: 200 });
  const auditedOkFetch = withAuditLogging(okFetch, {
    service: "example",
  });

  const response = await auditedOkFetch("/route/DAL123");
  assert.equal(response.status, 200);
  assert.match(
    logs[0][0],
    /^\[audit:\/route\/DAL123\]: 200 \+\d+ms$/,
  );

  await auditedOkFetch(
    "https://aerodatabox.p.rapidapi.com/flights/CallSign/UAL442/2026-05-11?dateLocalRole=Both",
  );
  assert.match(
    logs[1][0],
    /^\[audit:\/flights\/CallSign\/UAL442\/2026-05-11\]: 200 \+\d+ms$/,
  );

  const auditedErrorFetch = withAuditLogging(
    async () => {
      throw new Error("network failed");
    },
    { service: "broken" },
  );

  await assert.rejects(() => auditedErrorFetch("/broken"), /network failed/);
  assert.match(logs[2][0], /^\[audit:\/broken\]: ERROR \+\d+ms$/);
} finally {
  console.log = originalConsoleLog;
}
