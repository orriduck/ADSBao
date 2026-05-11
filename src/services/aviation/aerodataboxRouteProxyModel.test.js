import assert from "node:assert/strict";

import {
  AERODATABOX_MIN_REQUEST_INTERVAL_MS,
  buildAerodataboxFlightRouteResponse,
  buildAerodataboxFlightUrl,
  reserveAerodataboxRequestSlot,
  resolveAerodataboxDateLocal,
} from "./aerodataboxRouteProxyModel.js";

assert.equal(
  resolveAerodataboxDateLocal(new Date("2026-05-10T23:55:00Z")),
  "2026-05-10",
);
assert.equal(
  buildAerodataboxFlightUrl(" dal123 ", "2026-05-10"),
  "https://aerodatabox.p.rapidapi.com/flights/CallSign/DAL123/2026-05-10?dateLocalRole=Both&withAircraftImage=false&withLocation=false&withFlightPlan=false",
);
assert.equal(AERODATABOX_MIN_REQUEST_INTERVAL_MS, 1100);
assert.deepEqual(
  reserveAerodataboxRequestSlot({
    now: 1_000,
    nextAllowedAt: 0,
    minIntervalMs: 1_100,
  }),
  { delayMs: 0, nextAllowedAt: 2_100 },
);
assert.deepEqual(
  reserveAerodataboxRequestSlot({
    now: 1_050,
    nextAllowedAt: 2_100,
    minIntervalMs: 1_100,
  }),
  { delayMs: 1_050, nextAllowedAt: 3_200 },
);

const aerodataboxFlights = [
  {
    number: "BA 213",
    callSign: "BAW213",
    airline: {
      name: "British Airways",
      iata: "BA",
      icao: "BAW",
    },
    departure: {
      airport: {
        icao: "EGLL",
        iata: "LHR",
        name: "London Heathrow Airport",
        municipalityName: "London",
        countryCode: "GB",
        location: { lat: 51.4706, lon: -0.461941 },
      },
    },
    arrival: {
      airport: {
        icao: "KBOS",
        iata: "BOS",
        name: "Boston Logan International Airport",
        municipalityName: "Boston",
        countryCode: "US",
        location: { lat: 42.3643, lon: -71.0052 },
      },
    },
  },
];

const roundTripLegs = [
  {
    number: "MQ 4144",
    callSign: "ENY4144",
    status: "Arrived",
    airline: { name: "Envoy Air", iata: "MQ", icao: "ENY" },
    departure: {
      airport: {
        icao: "KORD",
        iata: "ORD",
        name: "Chicago O'Hare",
        municipalityName: "Chicago",
        countryCode: "US",
        location: { lat: 41.9786, lon: -87.9048 },
      },
    },
    arrival: {
      airport: {
        icao: "KORF",
        iata: "ORF",
        name: "Norfolk",
        municipalityName: "Norfolk",
        countryCode: "US",
        location: { lat: 36.8946, lon: -76.2012 },
      },
    },
  },
  {
    number: "MQ 4144",
    callSign: "ENY4144",
    status: "Approaching",
    airline: { name: "Envoy Air", iata: "MQ", icao: "ENY" },
    departure: {
      airport: {
        icao: "KORF",
        iata: "ORF",
        name: "Norfolk",
        municipalityName: "Norfolk",
        countryCode: "US",
        location: { lat: 36.8946, lon: -76.2012 },
      },
    },
    arrival: {
      airport: {
        icao: "KORD",
        iata: "ORD",
        name: "Chicago O'Hare",
        municipalityName: "Chicago",
        countryCode: "US",
        location: { lat: 41.9786, lon: -87.9048 },
      },
    },
  },
];

const route = buildAerodataboxFlightRouteResponse("BAW213", aerodataboxFlights, {
  icao: "KBOS",
  iata: "BOS",
});

assert.equal(route.callsign, "BAW213");
assert.equal(route.number, "213");
assert.equal(route.airline.icao, "BAW");
assert.equal(route.airline.iata, "BA");
assert.equal(route.origin.icao, "EGLL");
assert.equal(route.destination.icao, "KBOS");
assert.equal(route.route.icao, "EGLL-KBOS");
assert.equal(route.route.iata, "LHR-BOS");
assert.equal(route.airports.length, 2);
assert.equal(route.source, "aerodatabox");
assert.equal(route.confidence, "flight-status");

const activeRoundTripLeg = buildAerodataboxFlightRouteResponse(
  "ENY4144",
  roundTripLegs,
  {
    icao: "KORD",
    iata: "ORD",
  },
);

assert.equal(activeRoundTripLeg.origin.icao, "KORF");
assert.equal(activeRoundTripLeg.destination.icao, "KORD");
assert.equal(activeRoundTripLeg.route.icao, "KORF-KORD");

assert.equal(
  buildAerodataboxFlightRouteResponse("BAW213", aerodataboxFlights, {
    icao: "KJFK",
    iata: "JFK",
  }),
  null,
);
