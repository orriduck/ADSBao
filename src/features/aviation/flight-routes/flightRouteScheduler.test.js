import assert from "node:assert/strict";

import { createFlightRouteScheduler } from "./flightRouteScheduler.js";

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

function createManualTimer() {
  const callbacks = [];
  return {
    callbacks,
    schedule(callback) {
      callbacks.push(callback);
      return callback;
    },
    clear(callback) {
      const index = callbacks.indexOf(callback);
      if (index >= 0) callbacks.splice(index, 1);
    },
    runNext() {
      const callback = callbacks.shift();
      if (callback) callback();
    },
  };
}

{
  const timer = createManualTimer();
  const fetched = [];
  const route = {
    callsign: "DAL123",
    origin: { icao: "KATL" },
    destination: { icao: "KBOS" },
  };
  const scheduler = createFlightRouteScheduler({
    client: {
      async fetchFlightRoute(callsign, routeContext) {
        fetched.push({ callsign, routeContext });
        return route;
      },
    },
    config: {
      maxConcurrentLookups: 1,
      maxLookupsPerPass: 2,
      maxQueueSize: 10,
      queueIntervalMs: 0,
      auditLogIntervalMs: 0,
      hitCacheMs: 60_000,
      missCacheMs: 10_000,
    },
    logger: { info() {}, warn() {} },
    schedule: timer.schedule,
    clearSchedule: timer.clear,
    now: () => 1_700_000_000_000,
  });

  let notificationCount = 0;
  scheduler.subscribe(() => {
    notificationCount += 1;
  });

  const routeContext = {
    icao: "KBOS",
    iata: "BOS",
    lat: 42.3656,
    lon: -71.0096,
    routeProvider: "flightaware",
  };

  scheduler.syncAircraft({
    aircraft: [{ callsign: "DAL123", lat: 40.64, lon: -73.78 }],
    routeContext,
  });

  assert.equal(scheduler.getLoadingCount(), 1);
  timer.runNext();
  await flushPromises();

  assert.deepEqual(fetched, [{ callsign: "DAL123", routeContext }]);
  assert.equal(scheduler.getLoadingCount(), 0);
  assert.deepEqual(
    scheduler.getRoutesByCallsign({
      aircraft: [{ callsign: "dal123" }],
      routeContext,
    }),
    { DAL123: route },
  );
  assert.ok(notificationCount >= 2);

  scheduler.syncAircraft({
    aircraft: [{ callsign: "DAL123", lat: 40.64, lon: -73.78 }],
    routeContext,
  });
  assert.equal(timer.callbacks.length, 0);
  await flushPromises();
  assert.equal(fetched.length, 1);
  scheduler.dispose();
}

{
  const timer = createManualTimer();
  const scheduler = createFlightRouteScheduler({
    client: {
      async fetchFlightRoute() {
        throw new Error("network should not run");
      },
    },
    config: {
      maxConcurrentLookups: 1,
      maxLookupsPerPass: 2,
      maxQueueSize: 10,
      queueIntervalMs: 0,
      auditLogIntervalMs: 0,
      hitCacheMs: 60_000,
      missCacheMs: 10_000,
    },
    logger: { info() {}, warn() {} },
    schedule: timer.schedule,
    clearSchedule: timer.clear,
    now: () => 1_700_000_000_000,
  });

  const routeContext = { icao: "KJFK", iata: "JFK" };
  const temporaryRoute = {
    callsign: "AAL456",
    origin: { icao: "KLAX" },
    destination: { icao: "KJFK" },
  };

  scheduler.applyTemporaryRoute(" aal456 ", temporaryRoute, routeContext);

  assert.deepEqual(
    scheduler.getRoutesByCallsign({
      aircraft: [{ callsign: "AAL456" }],
      routeContext,
    }),
    { AAL456: temporaryRoute },
  );
  assert.equal(timer.callbacks.length, 0);
  scheduler.dispose();
}

{
  const timer = createManualTimer();
  const route = {
    callsign: "VIR26Q",
    callsignIcao: "VIR26Q",
    callsignIata: "VS26Q",
    origin: { icao: "KJFK", iata: "JFK" },
    destination: { icao: "EGLL", iata: "LHR" },
  };
  const scheduler = createFlightRouteScheduler({
    client: {
      async fetchFlightRoute() {
        return route;
      },
    },
    config: {
      maxConcurrentLookups: 1,
      maxLookupsPerPass: 2,
      maxQueueSize: 10,
      queueIntervalMs: 0,
      auditLogIntervalMs: 0,
      hitCacheMs: 60_000,
      missCacheMs: 10_000,
    },
    logger: { info() {}, warn() {} },
    schedule: timer.schedule,
    clearSchedule: timer.clear,
    now: () => 1_700_000_000_000,
  });

  const routeContext = { routeProvider: "flightaware" };
  scheduler.syncAircraft({
    aircraft: [{ callsign: "VIR26Q" }],
    routeContext,
  });
  timer.runNext();
  await flushPromises();

  assert.deepEqual(
    scheduler.getRoutesByCallsign({
      aircraft: [{ callsign: "VS26Q" }],
      routeContext,
    }),
    { VS26Q: route },
  );
  scheduler.dispose();
}

{
  const timer = createManualTimer();
  const scheduler = createFlightRouteScheduler({
    client: {
      async fetchFlightRoute() {
        throw new Error("terminal aircraft should not fetch a route");
      },
    },
    config: {
      maxConcurrentLookups: 1,
      maxLookupsPerPass: 2,
      maxQueueSize: 10,
      queueIntervalMs: 0,
      auditLogIntervalMs: 0,
      hitCacheMs: 60_000,
      missCacheMs: 10_000,
    },
    logger: { info() {}, warn() {} },
    schedule: timer.schedule,
    clearSchedule: timer.clear,
    now: () => 1_700_000_000_000,
  });

  const routeContext = { routeProvider: "flightaware" };
  scheduler.syncAircraft({
    aircraft: [
      {
        callsign: "AAL100",
        origin: "KJFK",
        destination: "KLAX",
        trackingState: { status: "flightaware_terminal" },
      },
    ],
    routeContext,
  });

  assert.equal(scheduler.getLoadingCount(), 0);
  assert.equal(timer.callbacks.length, 0);
  assert.deepEqual(
    scheduler.getRoutesByCallsign({
      aircraft: [
        {
          callsign: "AAL100",
          origin: "KJFK",
          destination: "KLAX",
          trackingState: { status: "flightaware_terminal" },
        },
      ],
      routeContext,
    }),
    {
      AAL100: {
        callsign: "AAL100",
        origin: { icao: "KJFK" },
        destination: { icao: "KLAX" },
        route: { icao: "KJFK-KLAX" },
        source: "aircraft-metadata",
        confidence: "position-metadata",
      },
    },
  );
  scheduler.dispose();
}
