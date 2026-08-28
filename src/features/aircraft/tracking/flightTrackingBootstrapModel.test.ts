import assert from "node:assert/strict";

import {
  resolveTrackedFlightBootstrapAircraft,
  resolveTrackedFlightBootstrapNearbyAircraft,
} from "./flightTrackingBootstrapModel";

const aircraft = {
  callsign: " jbu818 ",
  lat: 42.451,
  lon: -70.842,
  alt_baro: 9_125,
};

assert.deepEqual(
  resolveTrackedFlightBootstrapAircraft({
    callsign: "JBU818",
    navigationAircraft: aircraft,
  }),
  aircraft,
);

assert.equal(
  resolveTrackedFlightBootstrapAircraft({
    callsign: "JBU810",
    navigationAircraft: aircraft,
  }),
  null,
);

const nearbyAircraft = [
  aircraft,
  { callsign: "AAL2404", lat: 42.3, lon: -71.2 },
  { callsign: "BROKEN", lat: null, lon: -71.1 },
];

assert.deepEqual(
  resolveTrackedFlightBootstrapNearbyAircraft({
    callsign: "JBU818",
    navigationAircraft: aircraft,
    navigationNearbyAircraft: nearbyAircraft,
  }),
  nearbyAircraft.slice(0, 2),
);

const nextFlightAircraft = {
  callsign: "AAL2404",
  lat: 42.3,
  lon: -71.2,
  alt_baro: 7_500,
};

assert.deepEqual(
  resolveTrackedFlightBootstrapNearbyAircraft({
    callsign: "AAL2404",
    navigationAircraft: nextFlightAircraft,
    navigationNearbyAircraft: [aircraft, nextFlightAircraft],
  }),
  [aircraft, nextFlightAircraft],
);

assert.deepEqual(
  resolveTrackedFlightBootstrapNearbyAircraft({
    callsign: "JBU810",
    navigationAircraft: aircraft,
    navigationNearbyAircraft: nearbyAircraft,
  }),
  [],
);

assert.equal(
  resolveTrackedFlightBootstrapAircraft({
    callsign: "JBU818",
    navigationAircraft: { ...aircraft, lat: null },
  }),
  null,
);

assert.equal(
  resolveTrackedFlightBootstrapAircraft({
    callsign: "JBU818",
    navigationAircraft: { ...aircraft, lon: 181 },
  }),
  null,
);
