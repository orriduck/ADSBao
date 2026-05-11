import assert from "node:assert/strict";

import {
  buildRouteCacheKey,
  buildRoutesByCallsign,
  getRouteLookupStats,
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
  assert.equal(
    buildRouteCacheKey("dal123", { icao: "kbos", iata: "bos" }),
    "DAL123|KBOS|BOS",
  );

  const cache = new Map([
    ["DAL123|KBOS|BOS", { route, time: now - 1_000 }],
    ["DAL123|KJFK|JFK", { route: null, time: now - 1_000 }],
    ["MISS1", { route: null, time: now - 1_000 }],
    ["OLD", { route, time: now - 10 * 60 * 60 * 1000 }],
  ]);

  assert.equal(
    getFreshRouteCacheEntry(cache, "DAL123", now, {
      icao: "KBOS",
      iata: "BOS",
    })?.route,
    route,
  );
  assert.equal(
    getFreshRouteCacheEntry(cache, "DAL123", now, {
      icao: "KJFK",
      iata: "JFK",
    })?.route,
    null,
  );
  assert.equal(getFreshRouteCacheEntry(cache, "MISS1", now)?.route, null);
  assert.equal(getFreshRouteCacheEntry(cache, "OLD", now), null);
  assert.equal(cache.has("OLD"), false);
}

{
  const cache = new Map([["DAL123", { route, time: now }]]);
  const inFlight = new Set(["UAL456"]);
  const queued = new Set(["AAL789"]);
  const pending = resolvePendingRouteLookups({
    aircraft: [
      { callsign: " dal123 " },
      { callsign: "UAL456" },
      { callsign: "AAL789" },
      { callsign: "AAL789" },
      { callsign: "JBU123" },
      { callsign: "TOO-LONG-CALLSIGN" },
      { callsign: "" },
    ],
    cache,
    inFlight,
    queued,
    now,
    maxLookups: 3,
  });

  assert.deepEqual(pending, ["JBU123"]);
}

{
  const cache = new Map([
    ["DAL123", { route, time: now }],
    ["AAL789", { route: null, time: now }],
  ]);
  const stats = getRouteLookupStats({
    aircraft: [
      { callsign: "DAL123" },
      { callsign: "AAL789" },
      { callsign: "JBU123" },
      { callsign: "UAL456" },
      { callsign: "N12345" },
    ],
    cache,
    queued: new Set(["JBU123"]),
    inFlight: new Set(["UAL456"]),
    now,
  });

  assert.deepEqual(stats, {
    done: 2,
    in_queue: 1,
    inflight: 1,
    not_do: 1,
  });
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
