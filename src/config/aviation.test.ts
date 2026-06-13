import assert from "node:assert/strict";

import { FLIGHT_ROUTE_LOOKUP_CONFIG } from "./aviation";

assert.equal(
  FLIGHT_ROUTE_LOOKUP_CONFIG.maxConcurrentLookups,
  2,
  "route lookups should not saturate the browser network panel",
);
assert.equal(
  FLIGHT_ROUTE_LOOKUP_CONFIG.maxLookupsPerPass,
  4,
  "route lookups should enter the queue in small batches for live traffic pages",
);
assert.ok(
  FLIGHT_ROUTE_LOOKUP_CONFIG.queueIntervalMs >= 500,
  "route lookups should be spaced out behind realtime ADS-B traffic",
);

console.log("aviation.test.ts ok");
