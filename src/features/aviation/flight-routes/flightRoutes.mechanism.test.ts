import assert from "node:assert/strict";

import { resolveFlightRoute } from "./flightRoutes.mechanism";

const ADSBDB_ROUTE = Object.freeze({ source: "adsbdb", callsign: "AAL1234" });
const FLIGHTAWARE_ROUTE = Object.freeze({
  source: "flightaware",
  callsign: "AAL1234",
});
const OVERRIDE_ROUTE = Object.freeze({
  source: "community-feedback",
  callsign: "AAL1234",
});

{
  let accessChecks = 0;
  let providerCalls = 0;
  const route = await resolveFlightRoute({
    callsign: "AAL1234",
    feedbackRepository: {
      readActiveOverride: async () => ({ route_payload: OVERRIDE_ROUTE }),
    },
    shouldUseFlightAwareRouteProvider: async () => {
      accessChecks += 1;
      return true;
    },
    fetchFlightAwareRoute: async () => {
      providerCalls += 1;
      return FLIGHTAWARE_ROUTE;
    },
    fetchAdsbdbRoute: async () => {
      providerCalls += 1;
      return ADSBDB_ROUTE;
    },
  });

  assert.equal(route, FLIGHTAWARE_ROUTE);
  assert.equal(accessChecks, 1);
  assert.equal(providerCalls, 1);
}

{
  const calls = [];
  const route = await resolveFlightRoute({
    callsign: "AAL1234",
    feedbackRepository: null,
    shouldUseFlightAwareRouteProvider: async () => false,
    fetchFlightAwareRoute: async () => {
      calls.push("flightaware");
      return FLIGHTAWARE_ROUTE;
    },
    fetchAdsbdbRoute: async () => {
      calls.push("adsbdb");
      return ADSBDB_ROUTE;
    },
  });

  assert.equal(route, ADSBDB_ROUTE);
  assert.deepEqual(calls, ["adsbdb"]);
}

{
  const calls = [];
  const route = await resolveFlightRoute({
    callsign: "AAL1234",
    requestedProvider: "flightaware",
    feedbackRepository: null,
    shouldUseFlightAwareRouteProvider: async () => true,
    fetchFlightAwareRoute: async () => {
      calls.push("flightaware");
      return FLIGHTAWARE_ROUTE;
    },
    fetchAdsbdbRoute: async () => {
      calls.push("adsbdb");
      return ADSBDB_ROUTE;
    },
  });

  assert.equal(route, FLIGHTAWARE_ROUTE);
  assert.deepEqual(calls, ["flightaware"]);
}

{
  const calls = [];
  const route = await resolveFlightRoute({
    callsign: "AAL1234",
    requestedProvider: "flightaware",
    feedbackRepository: null,
    shouldUseFlightAwareRouteProvider: async () => false,
    fetchFlightAwareRoute: async () => {
      calls.push("flightaware");
      return FLIGHTAWARE_ROUTE;
    },
    fetchAdsbdbRoute: async () => {
      calls.push("adsbdb");
      return ADSBDB_ROUTE;
    },
  });

  assert.equal(route, ADSBDB_ROUTE);
  assert.deepEqual(calls, ["adsbdb"]);
}

{
  const calls = [];
  const route = await resolveFlightRoute({
    callsign: "AAL1234",
    feedbackRepository: null,
    shouldUseFlightAwareRouteProvider: async () => true,
    fetchFlightAwareRoute: async () => {
      calls.push("flightaware");
      return FLIGHTAWARE_ROUTE;
    },
    fetchAdsbdbRoute: async () => {
      calls.push("adsbdb");
      return ADSBDB_ROUTE;
    },
  });

  assert.equal(route, FLIGHTAWARE_ROUTE);
  assert.deepEqual(calls, ["flightaware"]);
}

{
  const calls = [];
  const route = await resolveFlightRoute({
    callsign: "AAL1234",
    requestedProvider: "adsbdb",
    feedbackRepository: null,
    shouldUseFlightAwareRouteProvider: async () => true,
    fetchFlightAwareRoute: async () => {
      calls.push("flightaware");
      return FLIGHTAWARE_ROUTE;
    },
    fetchAdsbdbRoute: async () => {
      calls.push("adsbdb");
      return ADSBDB_ROUTE;
    },
  });

  assert.equal(route, FLIGHTAWARE_ROUTE);
  assert.deepEqual(calls, ["flightaware"]);
}

// FA mode is exclusive: when FlightAware is enabled and the scraper
// returns null, we do NOT fall back to adsbdb. FA-tier users always
// receive FA-sourced metadata (or no route at all) so the origin/
// destination/airline shown in the UI never silently downgrades to
// the adsbdb static dataset.
{
  const calls = [];
  const route = await resolveFlightRoute({
    callsign: "AAL1234",
    feedbackRepository: null,
    shouldUseFlightAwareRouteProvider: async () => true,
    fetchFlightAwareRoute: async () => {
      calls.push("flightaware");
      return null;
    },
    fetchAdsbdbRoute: async () => {
      calls.push("adsbdb");
      return ADSBDB_ROUTE;
    },
  });

  assert.equal(route, null);
  assert.deepEqual(calls, ["flightaware"]);
}
