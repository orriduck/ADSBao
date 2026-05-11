import assert from "node:assert/strict";

import {
  enrichAircraftWithRoutes,
  resolveAirportProfile,
} from "./airportExplorerModel.js";
import { ARRIVAL, DEPARTURE, UNKNOWN } from "../../utils/aircraftMovement.js";

const fallbackProfile = resolveAirportProfile({ icao: "kbos" });
assert.equal(fallbackProfile.icao, "KBOS");
assert.equal(fallbackProfile.iata, "BOS");
assert.equal(fallbackProfile.name, "Boston Logan");
assert.equal(fallbackProfile.lat, 42.3656);
assert.equal(fallbackProfile.lon, -71.0096);

const providedProfile = resolveAirportProfile({
  icao: "kbos",
  airport: {
    icao: "KSEA",
    iata: "SEA",
    name: "Seattle-Tacoma International Airport",
    city: "Seattle",
    country: "United States",
    lat: 47.4502,
    lon: -122.3088,
  },
});
assert.equal(providedProfile.icao, "KSEA");
assert.equal(providedProfile.iata, "SEA");
assert.equal(providedProfile.city, "Seattle");

const enriched = enrichAircraftWithRoutes({
  airportProfile: fallbackProfile,
  aircraft: [
    { icao24: "a1", callsign: " DAL 123 " },
    { icao24: "a2", callsign: "JBU456" },
    { icao24: "a3", callsign: "N12345" },
  ],
  routesByCallsign: {
    DAL123: {
      origin: { icao: "KBOS", iata: "BOS" },
      destination: { icao: "KATL", iata: "ATL" },
    },
    JBU456: {
      origin: { icao: "KLAX", iata: "LAX" },
      destination: { icao: "KBOS", iata: "BOS" },
    },
    N12345: {
      origin: { icao: "KJFK", iata: "JFK" },
      destination: { icao: "KORD", iata: "ORD" },
    },
  },
});

assert.equal(enriched[0].movement, DEPARTURE);
assert.equal(enriched[0].flightRouteLabel, "BOS -> ATL");
assert.equal(enriched[0].airportContext.airportIcao, "KBOS");
assert.equal(enriched[0].airportContext.movement, "departure");
assert.equal(enriched[1].movement, ARRIVAL);
assert.equal(enriched[1].flightRouteLabel, "LAX -> BOS");
assert.equal(enriched[1].airportContext.movement, "arrival");
assert.equal(enriched[2].movement, UNKNOWN);
assert.equal(enriched[2].flightRouteLabel, "JFK -> ORD");
assert.equal(enriched[2].airportContext.movement, "unknown");

const ordProfile = resolveAirportProfile({ icao: "kord" });
const roundTripRoute = {
  origin: { icao: "KORD", iata: "ORD" },
  destination: { icao: "KORD", iata: "ORD" },
  airports: [
    { icao: "KORD", iata: "ORD", lat: 41.9786, lon: -87.9048 },
    { icao: "KMDT", iata: "MDT", lat: 40.1935, lon: -76.763397 },
    { icao: "KORD", iata: "ORD", lat: 41.9786, lon: -87.9048 },
  ],
};

const roundTripEnriched = enrichAircraftWithRoutes({
  airportProfile: ordProfile,
  aircraft: [
    {
      icao24: "rt1",
      callsign: "AAL3243",
      lat: 42.05,
      lon: -88.6,
      track: 96,
    },
    {
      icao24: "rt2",
      callsign: "AAL3244",
      lat: 42.05,
      lon: -88.6,
      track: 276,
    },
    {
      icao24: "rt3",
      callsign: "AAL3245",
      lat: 42.05,
      lon: -88.6,
    },
  ],
  routesByCallsign: {
    AAL3243: roundTripRoute,
    AAL3244: roundTripRoute,
    AAL3245: roundTripRoute,
  },
});

assert.equal(roundTripEnriched[0].movement, ARRIVAL);
assert.equal(roundTripEnriched[0].airportContext.movement, "arrival");
assert.equal(roundTripEnriched[1].movement, DEPARTURE);
assert.equal(roundTripEnriched[1].airportContext.movement, "departure");
assert.equal(roundTripEnriched[2].movement, UNKNOWN);
assert.equal(roundTripEnriched[2].airportContext.movement, "unknown");
