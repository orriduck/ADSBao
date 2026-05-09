import assert from "node:assert/strict";

import { withAuditLogging } from "./apiLogger.js";

const originalConsoleLog = console.log;
const logs = [];

console.log = (...args) => {
  logs.push(args);
};

try {
  const okFetch = async () => ({ status: 200 });
  const auditedOkFetch = withAuditLogging(okFetch, {
    service: "example",
    getParams: () => ({ callsign: "DAL123" }),
  });

  const response = await auditedOkFetch("/route/DAL123");
  assert.equal(response.status, 200);
  assert.equal(logs[0][0], "[audit:api]");
  assert.equal(logs[0][1].service, "example");
  assert.deepEqual(logs[0][1].params, { callsign: "DAL123" });
  assert.equal(logs[0][1].status, 200);
  assert.equal(typeof logs[0][1].duration_ms, "number");

  const auditedErrorFetch = withAuditLogging(
    async () => {
      throw new Error("network failed");
    },
    { service: "broken" },
  );

  await assert.rejects(() => auditedErrorFetch("/broken"), /network failed/);
  assert.equal(logs[1][0], "[audit:api]");
  assert.deepEqual(logs[1][1], {
    service: "broken",
    error: "network failed",
    duration_ms: logs[1][1].duration_ms,
  });
  assert.equal(typeof logs[1][1].duration_ms, "number");
} finally {
  console.log = originalConsoleLog;
}
