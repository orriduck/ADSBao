import assert from "node:assert/strict";

import { buildRouteSubscriptionRequests } from "./useFlightRoutes";

assert.deepEqual(
  buildRouteSubscriptionRequests("dal58", {
    icao: "kbos",
    routeProvider: "flightaware",
  }),
  [
    {
      channel: "route:DAL58:airport:KBOS",
      params: { routeProvider: "flightaware" },
    },
    {
      channel: "route:DAL58:airport:KBOS",
      params: { routeProvider: "adsbdb" },
    },
  ],
);

assert.deepEqual(
  buildRouteSubscriptionRequests("dal58", {
    icao: "kbos",
    routeProvider: "adsbdb",
  }),
  [
    {
      channel: "route:DAL58:airport:KBOS",
      params: { routeProvider: "adsbdb" },
    },
  ],
);

console.log("useFlightRoutes.test.ts ok");
