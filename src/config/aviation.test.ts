import assert from "node:assert/strict";

import {
  AIRPORT_MAP_FIT_ZOOM_MIN,
  AIRPORT_MAP_ZOOM_MIN,
  FLIGHT_ROUTE_LOOKUP_CONFIG,
} from "./aviation";

assert.equal(
  FLIGHT_ROUTE_LOOKUP_CONFIG.hitCacheMs,
  30 * 60 * 1000,
  "route hits should match the approved 30-minute cache window",
);
assert.ok(
  FLIGHT_ROUTE_LOOKUP_CONFIG.missCacheMs < FLIGHT_ROUTE_LOOKUP_CONFIG.hitCacheMs,
  "route misses should expire before successful route hits",
);
assert.ok(
  AIRPORT_MAP_FIT_ZOOM_MIN < AIRPORT_MAP_ZOOM_MIN,
  "programmatic full-route fitting must be able to zoom beyond the follow slider",
);

console.log("aviation.test.ts ok");
