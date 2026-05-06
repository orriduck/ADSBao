import assert from "node:assert/strict";

import {
  buildRoutesByCallsign,
  getFreshRouteCacheEntry,
  resolvePendingRouteLookups,
} from "./flightRouteLookupModel.js";

const now = 1_700_000_000_000;
const route = {
  callsign: "DAL123",
  origin: { icao: "KATL" },
  destination: { icao: "KBOS" },
};

{
  const cache = new Map([
    ["DAL123", { route, time: now - 1_000 }],
    ["MISS1", { route: null, time: now - 1_000 }],
    ["OLD", { route, time: now - 10 * 60 * 60 * 1000 }],
  ]);

  assert.equal(getFreshRouteCacheEntry(cache, "DAL123", now)?.route, route);
  assert.equal(getFreshRouteCacheEntry(cache, "MISS1", now)?.route, null);
  assert.equal(getFreshRouteCacheEntry(cache, "OLD", now), null);
  assert.equal(cache.has("OLD"), false);
}

{
  const cache = new Map([["DAL123", { route, time: now }]]);
  const inFlight = new Set(["UAL456"]);
  const pending = resolvePendingRouteLookups({
    aircraft: [
      { callsign: " dal123 " },
      { callsign: "UAL456" },
      { callsign: "AAL789" },
      { callsign: "AAL789" },
      { callsign: "TOO-LONG-CALLSIGN" },
      { callsign: "" },
    ],
    cache,
    inFlight,
    now,
    maxLookups: 3,
  });

  assert.deepEqual(pending, ["AAL789"]);
}

{
  const cache = new Map([
    ["DAL123", { route, time: now }],
    ["AAL789", { route: null, time: now }],
  ]);
  const routes = buildRoutesByCallsign({
    aircraft: [{ callsign: "dal123" }, { callsign: "aal789" }],
    cache,
    now,
  });

  assert.deepEqual(routes, { DAL123: route });
}
