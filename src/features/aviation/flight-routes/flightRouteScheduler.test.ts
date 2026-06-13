import assert from "node:assert/strict";

import { createFlightRouteScheduler } from "./flightRouteScheduler";

const now = 1_700_000_000_000;

const lot29Route = {
  callsign: "LOT29",
  callsignIcao: "LOT29",
  callsignIata: "LO29",
  origin: { icao: "EPWA", iata: "WAW" },
  destination: { icao: "KMIA", iata: "MIA" },
  route: { icao: "EPWA-KMIA", iata: "WAW-MIA" },
};

{
  const scheduler = createFlightRouteScheduler({ now: () => now });
  const versions: number[] = [];
  const unsubscribe = scheduler.subscribe((state) => {
    versions.push(state.routeVersion);
  });

  scheduler.applyRouteResult(" lot29 ", lot29Route, {
    lat: 42.32,
    lon: -71.56,
    routeProvider: "adsbdb",
  });

  assert.deepEqual(versions, [0, 1]);
  assert.deepEqual(
    scheduler.getRoutesByCallsign({
      aircraft: [{ callsign: "LOT29" }],
      routeContext: { lat: 42.42, lon: -71.36, routeProvider: "adsbdb" },
    }).LOT29?.route,
    lot29Route.route,
  );
  assert.deepEqual(
    scheduler.getPendingCallsigns({
      aircraft: [{ callsign: "LOT29" }],
      routeContext: { lat: 42.42, lon: -71.36, routeProvider: "adsbdb" },
      maxLookups: 3,
    }),
    [],
  );

  unsubscribe();
  scheduler.dispose();
}

{
  const scheduler = createFlightRouteScheduler({ now: () => now });
  scheduler.applyRouteResult("NOPE123", null, {
    lat: 42.32,
    lon: -71.56,
  });

  assert.deepEqual(
    scheduler.getRoutesByCallsign({
      aircraft: [{ callsign: "NOPE123" }],
      routeContext: { lat: 42.42, lon: -71.36 },
    }),
    {},
  );
  assert.deepEqual(
    scheduler.getPendingCallsigns({
      aircraft: [{ callsign: "NOPE123" }],
      routeContext: { lat: 42.42, lon: -71.36 },
      maxLookups: 3,
    }),
    [],
  );
  scheduler.dispose();
}

{
  const scheduler = createFlightRouteScheduler({ now: () => now });
  const route = {
    callsign: "VIR26Q",
    callsignIcao: "VIR26Q",
    callsignIata: "VS26Q",
    origin: { icao: "KJFK", iata: "JFK" },
    destination: { icao: "EGLL", iata: "LHR" },
  };

  scheduler.applyTemporaryRoute("VIR26Q", route, { routeProvider: "adsbdb" });

  assert.deepEqual(
    scheduler.getRoutesByCallsign({
      aircraft: [{ callsign: "VS26Q" }],
      routeContext: { routeProvider: "adsbdb" },
    }),
    { VS26Q: route },
  );
  scheduler.dispose();
}
