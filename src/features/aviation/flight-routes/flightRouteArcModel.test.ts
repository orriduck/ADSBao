import assert from "node:assert/strict";

import { ROUTE_PROVIDER } from "../sourceDisplayModel";
import {
  buildFlightAwareRouteArcPath,
  resolveFocusedFlightAwareRouteArcPath,
  shouldShowFlightAwareRouteArc,
} from "./flightRouteArcModel";

const flightAwareRoute = {
  source: "flightaware",
  origin: { icao: "KBOS", lat: 42.3656, lon: -71.0096 },
  destination: { icao: "OMDB", lat: 25.2532, lon: 55.3657 },
};

{
  assert.equal(
    shouldShowFlightAwareRouteArc({
      route: { ...flightAwareRoute, source: "adsbdb" },
      routeProvider: ROUTE_PROVIDER.FLIGHTAWARE,
      routeEndpointAirportsOnly: false,
    }),
    true,
  );

  const path = buildFlightAwareRouteArcPath({
    route: flightAwareRoute,
    routeProvider: ROUTE_PROVIDER.FLIGHTAWARE,
    routeEndpointAirportsOnly: false,
    from: { lat: 42.36, lon: -70.72 },
    segments: 8,
  });

  assert.equal(path.length, 9);
  assert.deepEqual(path[0], [42.36, -70.72]);
  assert.deepEqual(path.at(-1), [25.2532, 55.3657]);
}

{
  assert.equal(
    shouldShowFlightAwareRouteArc({
      route: { ...flightAwareRoute, source: "adsbdb" },
      routeProvider: ROUTE_PROVIDER.ADSBDB,
      routeEndpointAirportsOnly: false,
    }),
    false,
  );

  assert.deepEqual(
    buildFlightAwareRouteArcPath({
      route: { ...flightAwareRoute, source: "adsbdb" },
      routeProvider: ROUTE_PROVIDER.ADSBDB,
      routeEndpointAirportsOnly: false,
      from: { lat: 42.36, lon: -70.72 },
    }),
    [],
  );
}

{
  assert.equal(
    shouldShowFlightAwareRouteArc({
      route: { ...flightAwareRoute, source: "adsbdb" },
      routeProvider: ROUTE_PROVIDER.ADSBDB,
      routeEndpointAirportsOnly: true,
    }),
    true,
  );
}

{
  const selectedRoute = {
    source: "flightaware",
    origin: { icao: "KJFK", lat: 40.6413, lon: -73.7781 },
    destination: { icao: "RJTT", lat: 35.5494, lon: 139.7798 },
  };
  const path = resolveFocusedFlightAwareRouteArcPath({
    selectedAircraft: { callsign: "JAL5", flightRoute: selectedRoute },
    focalAircraft: { callsign: "AAL100", flightRoute: flightAwareRoute },
    routeProvider: ROUTE_PROVIDER.FLIGHTAWARE,
    routeEndpointAirportsOnly: true,
    from: { lat: 40.71, lon: -73.9 },
    segments: 8,
  });

  assert.equal(path.length, 9);
  assert.deepEqual(path.at(-1), [25.2532, 55.3657]);
}

console.log("flightRouteArcModel.test.ts ok");
