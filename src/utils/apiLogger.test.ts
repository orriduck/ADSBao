import assert from "node:assert/strict";

import { withAuditLogging } from "./apiLogger";

const originalConsoleLog = console.log;
const logs = [];

console.log = (...args) => {
  logs.push(args);
};

try {
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

  // When the response carries x-data-source, the audit line picks it up.
  const sourcedOkFetch = withAuditLogging(
    async () => ({
      status: 200,
      headers: {
        get: (name) => (name.toLowerCase() === "x-data-source" ? "adsb.fi" : null),
      },
    }),
    { service: "example" },
  );
  await sourcedOkFetch("/api/proxy/aircraft/positions/40.6/-73.7/30");
  assert.match(
    logs[2][0],
    /^\[audit:\/api\/proxy\/aircraft\/positions\/40\.6\/-73\.7\/30\]: 200 \+\d+ms \(adsb\.fi\)$/,
  );

  // x-provider-attempts wins when present and shows the chain with statuses
  // on intermediate hops (the trailing hop drops its status because the outer
  // log already shows the final HTTP status).
  const chainedFetch = withAuditLogging(
    async () => ({
      status: 502,
      headers: {
        get: (name) => {
          const key = name.toLowerCase();
          if (key === "x-provider-attempts") return "adsb.lol:502;adsb.fi:429";
          if (key === "x-data-source") return "failed";
          return null;
        },
      },
    }),
    { service: "example" },
  );
  await chainedFetch("/api/proxy/aircraft/positions/40.6/-73.7/30");
  assert.match(
    logs[3][0],
    /^\[audit:\/api\/proxy\/aircraft\/positions\/40\.6\/-73\.7\/30\]: 502 \+\d+ms \(adsb\.lol:502 → adsb\.fi\)$/,
  );

  // Single-attempt success collapses to bare provider id (no status noise).
  const singleAttemptFetch = withAuditLogging(
    async () => ({
      status: 200,
      headers: {
        get: (name) =>
          name.toLowerCase() === "x-provider-attempts" ? "adsb.lol:200" : null,
      },
    }),
    { service: "example" },
  );
  await singleAttemptFetch("/api/proxy/aircraft/positions/40.6/-73.7/30");
  assert.match(
    logs[4][0],
    /^\[audit:\/api\/proxy\/aircraft\/positions\/40\.6\/-73\.7\/30\]: 200 \+\d+ms \(adsb\.lol\)$/,
  );

  const auditedErrorFetch = withAuditLogging(
    async () => {
      throw new Error("network failed");
    },
    { service: "broken" },
  );

  await assert.rejects(() => auditedErrorFetch("/broken"), /network failed/);
  assert.match(logs[5][0], /^\[audit:\/broken\]: ERROR \+\d+ms$/);
} finally {
  console.log = originalConsoleLog;
}
