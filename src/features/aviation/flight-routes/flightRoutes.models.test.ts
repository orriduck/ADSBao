import assert from "node:assert/strict";

import { buildRouteCacheHeaders } from "./flightRoutes.models";

assert.deepEqual(
  buildRouteCacheHeaders(
    { source: "flightaware", callsign: "RPA4397" },
    { bypassSharedCache: true },
  ),
  { "Cache-Control": "no-store" },
);

assert.equal(
  buildRouteCacheHeaders({ source: "adsbdb", callsign: "RPA4397" })[
    "Cache-Control"
  ],
  "public, max-age=0, s-maxage=3600, stale-while-revalidate=600",
);

console.log("flightRoutes.models.test.ts ok");
