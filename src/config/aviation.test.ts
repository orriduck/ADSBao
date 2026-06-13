import assert from "node:assert/strict";

import { FLIGHT_ROUTE_LOOKUP_CONFIG } from "./aviation";

assert.equal(
  FLIGHT_ROUTE_LOOKUP_CONFIG.maxQueueSize,
  60,
  "route subscriptions should stay bounded per aircraft pass",
);
assert.equal(
  FLIGHT_ROUTE_LOOKUP_CONFIG.hitCacheMs,
  6 * 60 * 60 * 1000,
  "route hits should stay warm across long tracking sessions",
);
assert.ok(
  FLIGHT_ROUTE_LOOKUP_CONFIG.missCacheMs < FLIGHT_ROUTE_LOOKUP_CONFIG.hitCacheMs,
  "route misses should expire before successful route hits",
);

console.log("aviation.test.ts ok");
