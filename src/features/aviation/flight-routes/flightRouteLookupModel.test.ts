import assert from "node:assert/strict";

import {
  buildRouteProxyRequest,
  buildRouteCacheKey,
  buildRoutesByCallsign,
  getRouteLookupStats,
  resolvePendingRouteLookups,
  resolveRouteLookupTransport,
  writeRouteCacheEntry,
} from "./flightRouteLookupModel";

const now = 1_700_000_000_000;
const route = {
  callsign: "DAL123",
  origin: { icao: "KATL" },
  destination: { icao: "KBOS" },
};

{
  assert.equal(
    resolveRouteLookupTransport({ routeProvider: "flightaware" }),
    "proxy",
  );
  assert.equal(
    resolveRouteLookupTransport({ routeProvider: "adsbdb" }),
    "realtime",
  );
  assert.deepEqual(
    buildRouteProxyRequest(" aal 1234 ", { routeProvider: "flightaware" }),
    {
      callsign: "AAL1234",
      url: "/api/proxy/flight-routes/callsign/AAL1234?provider=flightaware",
    },
  );
  assert.deepEqual(buildRouteProxyRequest("aal1234", {}), {
    callsign: "AAL1234",
    url: "/api/proxy/flight-routes/callsign/AAL1234",
  });
  assert.equal(
    buildRouteProxyRequest("bad-call", { routeProvider: "flightaware" }),
    null,
  );
}

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
  assert.equal(
    buildRouteCacheKey("dal123", { lat: 42.3656, lon: -71.0096 }),
    "DAL123|CENTER|42.4|-71",
  );
  assert.notEqual(
    buildRouteCacheKey("dal123", { lat: 42.3656, lon: -71.0096 }),
    buildRouteCacheKey("dal123", { lat: 40.6413, lon: -73.7781 }),
  );

  const cache = new Map([
    ["DAL123|KBOS|BOS", { route, time: now - 1_000 }],
    ["DAL123|KBOS|BOS|FLIGHTAWARE", { route: null, time: now - 1_000 }],
    ["DAL123|KJFK|JFK", { route: null, time: now - 1_000 }],
    ["MISS1", { route: null, time: now - 1_000 }],
    ["OLD", { route, time: now - 10 * 60 * 60 * 1000 }],
  ]);

  assert.deepEqual(
    buildRoutesByCallsign({
      aircraft: [{ callsign: "DAL123" }],
      cache,
      now,
      routeContext: { icao: "KBOS", iata: "BOS" },
    }),
    { DAL123: route },
  );
  assert.deepEqual(
    buildRoutesByCallsign({
      aircraft: [{ callsign: "DAL123" }],
      cache,
      now,
      routeContext: { icao: "KBOS", iata: "BOS", routeProvider: "flightaware" },
    }),
    {},
  );
  assert.deepEqual(
    buildRoutesByCallsign({
      aircraft: [{ callsign: "DAL123" }],
      cache,
      now,
      routeContext: { icao: "KJFK", iata: "JFK" },
    }),
    {},
  );
  assert.deepEqual(
    buildRoutesByCallsign({
      aircraft: [{ callsign: "MISS1" }],
      cache,
      now,
    }),
    {},
  );
  buildRoutesByCallsign({ aircraft: [{ callsign: "OLD" }], cache, now });
  assert.equal(cache.has("OLD"), false);
}

{
  const cache = new Map();
  writeRouteCacheEntry(
    cache,
    "LOT29",
    {
      callsign: "LOT29",
      callsignIcao: "LOT29",
      callsignIata: "LO29",
      origin: { icao: "EPWA", iata: "WAW" },
      destination: { icao: "KMIA", iata: "MIA" },
      route: { icao: "EPWA-KMIA", iata: "WAW-MIA" },
    },
    now,
    { lat: 42.32, lon: -71.56, routeProvider: "adsbdb" },
  );

  assert.deepEqual(
    buildRoutesByCallsign({
      aircraft: [{ callsign: "LOT29" }],
      cache,
      now,
      routeContext: { lat: 42.42, lon: -71.36, routeProvider: "adsbdb" },
    }).LOT29?.route,
    { icao: "EPWA-KMIA", iata: "WAW-MIA" },
  );
  assert.deepEqual(
    resolvePendingRouteLookups({
      aircraft: [{ callsign: "LOT29" }],
      cache,
      inFlight: new Set(),
      routeContext: { lat: 42.42, lon: -71.36, routeProvider: "adsbdb" },
      now,
      maxLookups: 3,
    }),
    [],
  );
}

{
  const cache = new Map();
  const flightAwareRoute = {
    callsign: "AAL1234",
    source: "flightaware",
    origin: { icao: "KBOS", iata: "BOS" },
    destination: { icao: "KLAX", iata: "LAX" },
    route: { icao: "KBOS-KLAX", iata: "BOS-LAX" },
  };
  writeRouteCacheEntry(cache, "AAL1234", flightAwareRoute, now, {
    icao: "KBOS",
    iata: "BOS",
    routeProvider: "flightaware",
  });

  assert.equal(cache.has("AAL1234"), false);
  assert.equal(cache.has("AAL1234|KBOS|BOS|FLIGHTAWARE"), true);
  assert.deepEqual(
    buildRoutesByCallsign({
      aircraft: [{ callsign: "AAL1234" }],
      cache,
      now,
      routeContext: { icao: "KBOS", iata: "BOS" },
    }),
    {},
  );
  assert.deepEqual(
    buildRoutesByCallsign({
      aircraft: [{ callsign: "AAL1234" }],
      cache,
      now,
      routeContext: { icao: "KBOS", iata: "BOS", routeProvider: "flightaware" },
    }).AAL1234?.source,
    "flightaware",
  );
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

{
  const routes = buildRoutesByCallsign({
    aircraft: [
      {
        callsign: "VIR26Q",
        origin: "KJFK",
        destination: "EGLL",
        positionQuality: { source: "flightaware", kind: "predicted" },
      },
    ],
    cache: new Map(),
    now,
  });

  assert.deepEqual(routes, {
    VIR26Q: {
      callsign: "VIR26Q",
      origin: { icao: "KJFK" },
      destination: { icao: "EGLL" },
      route: { icao: "KJFK-EGLL" },
      source: "aircraft-metadata",
      confidence: "position-metadata",
    },
  });
}

// rankCandidatesByDistance: aircraft farthest from focal airport rank first.
// KBOS focal -> JBU123 over Lisbon (~3000nm) outranks DAL123 over NYC (~190nm)
// outranks UAL456 directly over KBOS (~0nm).
{
  const ranked = resolvePendingRouteLookups({
    aircraft: [
      { callsign: "UAL456", lat: 42.36, lon: -71.01 },
      { callsign: "DAL123", lat: 40.64, lon: -73.78 },
      { callsign: "JBU123", lat: 38.78, lon: -9.13 },
    ],
    cache: new Map(),
    inFlight: new Set(),
    routeContext: { icao: "KBOS", lat: 42.3656, lon: -71.0096 },
    now,
    maxLookups: 3,
  });
  assert.deepEqual(ranked, ["JBU123", "DAL123", "UAL456"]);
}

// Without focal coords, source order is preserved.
{
  const ranked = resolvePendingRouteLookups({
    aircraft: [
      { callsign: "UAL456", lat: 42, lon: -71 },
      { callsign: "DAL123", lat: 40, lon: -73 },
      { callsign: "JBU123", lat: 38, lon: -9 },
    ],
    cache: new Map(),
    inFlight: new Set(),
    routeContext: {},
    now,
    maxLookups: 3,
  });
  assert.deepEqual(ranked, ["UAL456", "DAL123", "JBU123"]);
}

// Aircraft missing lat/lon land last (treated as distance -1).
{
  const ranked = resolvePendingRouteLookups({
    aircraft: [
      { callsign: "UAL456" },
      { callsign: "DAL123", lat: 40.64, lon: -73.78 },
      { callsign: "JBU123", lat: 38.78, lon: -9.13 },
    ],
    cache: new Map(),
    inFlight: new Set(),
    routeContext: { icao: "KBOS", lat: 42.3656, lon: -71.0096 },
    now,
    maxLookups: 3,
  });
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

{
  const aircraft = [
    {
      callsign: "AAL100",
      origin: "KJFK",
      destination: "KLAX",
      trackingState: { status: "flightaware_terminal" },
    },
    {
      callsign: "DAL123",
      lat: 40.64,
      lon: -73.78,
      trackingState: { status: "adsb_live" },
    },
  ];
  const pending = resolvePendingRouteLookups({
    aircraft,
    cache: new Map(),
    inFlight: new Set(),
    queued: new Set(),
    routeContext: { routeProvider: "flightaware" },
    now,
    maxLookups: 3,
  });
  const routes = buildRoutesByCallsign({
    aircraft,
    cache: new Map(),
    routeContext: { routeProvider: "flightaware" },
    now,
  });

  assert.deepEqual(pending, ["DAL123"]);
  assert.deepEqual(routes.AAL100, {
    callsign: "AAL100",
    origin: { icao: "KJFK" },
    destination: { icao: "KLAX" },
    route: { icao: "KJFK-KLAX" },
    source: "aircraft-metadata",
    confidence: "position-metadata",
  });
}

{
  const aircraft = [
    {
      callsign: "SQ26",
      lat: 45.1,
      lon: -42.2,
      trackingState: { status: "stale" },
    },
    {
      callsign: "DAL123",
      trackingState: { status: "missing" },
    },
    {
      callsign: "AAL100",
      trackingState: { status: "flightaware_terminal" },
    },
  ];
  assert.deepEqual(
    resolvePendingRouteLookups({
      aircraft,
      cache: new Map(),
      inFlight: new Set(),
      now,
      maxLookups: 3,
    }),
    ["SQ26"],
  );
}
