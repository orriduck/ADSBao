import assert from "node:assert/strict";

import {
  buildRouteCacheKey,
  buildRoutesByCallsign,
  getRouteLookupStats,
  getFreshRouteCacheEntry,
  rankCandidatesByDistance,
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
  assert.equal(
    buildRouteCacheKey("dal123", {
      icao: "kbos",
      iata: "bos",
      routeProvider: "flightaware",
    }),
    "DAL123|KBOS|BOS|FLIGHTAWARE",
  );
  assert.notEqual(
    buildRouteCacheKey("dal123", { icao: "kbos", iata: "bos" }),
    buildRouteCacheKey("dal123", {
      icao: "kbos",
      iata: "bos",
      routeProvider: "flightaware",
    }),
  );

  const cache = new Map([
    ["DAL123|KBOS|BOS", { route, time: now - 1_000 }],
    ["DAL123|KBOS|BOS|FLIGHTAWARE", { route: null, time: now - 1_000 }],
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
      icao: "KBOS",
      iata: "BOS",
      routeProvider: "flightaware",
    })?.route,
    null,
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

// rankCandidatesByDistance: aircraft farthest from focal airport rank first.
// KBOS focal -> JBU123 over Lisbon (~3000nm) outranks DAL123 over NYC (~190nm)
// outranks UAL456 directly over KBOS (~0nm).
{
  const ranked = rankCandidatesByDistance(
    [
      { callsign: "UAL456", lat: 42.36, lon: -71.01 },
      { callsign: "DAL123", lat: 40.64, lon: -73.78 },
      { callsign: "JBU123", lat: 38.78, lon: -9.13 },
    ],
    { icao: "KBOS", lat: 42.3656, lon: -71.0096 },
  );
  assert.deepEqual(ranked, ["JBU123", "DAL123", "UAL456"]);
}

// Without focal coords, source order is preserved.
{
  const ranked = rankCandidatesByDistance(
    [
      { callsign: "UAL456", lat: 42, lon: -71 },
      { callsign: "DAL123", lat: 40, lon: -73 },
      { callsign: "JBU123", lat: 38, lon: -9 },
    ],
    {},
  );
  assert.deepEqual(ranked, ["UAL456", "DAL123", "JBU123"]);
}

// Aircraft missing lat/lon land last (treated as distance -1).
{
  const ranked = rankCandidatesByDistance(
    [
      { callsign: "UAL456" },
      { callsign: "DAL123", lat: 40.64, lon: -73.78 },
      { callsign: "JBU123", lat: 38.78, lon: -9.13 },
    ],
    { icao: "KBOS", lat: 42.3656, lon: -71.0096 },
  );
  assert.deepEqual(ranked, ["JBU123", "DAL123", "UAL456"]);
}

// resolvePendingRouteLookups respects the distance ranking when focal coords
// are provided.
{
  const aircraft = [
    { callsign: "UAL456", lat: 42.36, lon: -71.01 }, // ~0 nm
    { callsign: "DAL123", lat: 40.64, lon: -73.78 }, // ~190 nm
    { callsign: "JBU123", lat: 38.78, lon: -9.13 }, // ~3000 nm
  ];
  const pending = resolvePendingRouteLookups({
    aircraft,
    cache: new Map(),
    inFlight: new Set(),
    queued: new Set(),
    routeContext: { icao: "KBOS", lat: 42.3656, lon: -71.0096 },
    now,
    maxLookups: 2,
  });
  // Farthest two first, limited to 2.
  assert.deepEqual(pending, ["JBU123", "DAL123"]);
}
