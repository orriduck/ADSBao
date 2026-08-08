import assert from "node:assert/strict";

import {
  isTemporaryRouteFailure,
  parseRetryAfterMs,
  resolveRouteRetryDelayMs,
} from "./flightRouteRetryModel";

assert.equal(isTemporaryRouteFailure(429), true);
assert.equal(isTemporaryRouteFailure(503), true);
assert.equal(isTemporaryRouteFailure(404), false);
assert.equal(isTemporaryRouteFailure(null), true);
assert.equal(parseRetryAfterMs("12"), 12_000);
assert.equal(
  parseRetryAfterMs("2026-08-08T00:00:05Z", Date.parse("2026-08-08T00:00:00Z")),
  5_000,
);
assert.equal(
  resolveRouteRetryDelayMs({ attempt: 0, random: () => 0.5 }),
  2_000,
);
assert.equal(
  resolveRouteRetryDelayMs({ attempt: 0, retryAfterMs: 9_000, random: () => 0 }),
  9_000,
);
assert.equal(
  resolveRouteRetryDelayMs({ attempt: 0, retryAfterMs: 120_000, random: () => 0 }),
  120_000,
  "a server Retry-After longer than local backoff must be honored",
);

console.log("flightRouteRetryModel.test.ts ok");
