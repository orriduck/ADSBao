import assert from "node:assert/strict";

import {
  matchAirportFidsAircraft,
  matchAirportFidsAircraftList,
} from "./airportFidsMatcher.js";

const focusAirport = {
  icao: "KBOS",
  iata: "BOS",
  name: "Boston Logan",
  municipality: "Boston",
  country: "US",
  lat: 42.3656,
  lon: -71.0096,
};

const airportFidsFlights = [
  {
    id: "arrival-jbu892",
    direction: "arrival",
    callsign: "JBU892",
    flightNumber: "892",
    airline: { iata: "B6", icao: "JBU", name: "JetBlue" },
    origin: { icao: "KTPA", iata: "TPA" },
    destination: { icao: "KBOS", iata: "BOS" },
    scheduledTimeLocal: "2026-05-14 14:13-04:00",
    aircraft: { registration: "N584JB", modeS: "A7858E" },
    matchKeys: {
      callsign: "JBU892",
      flightNumber: "892",
      convertedCallsigns: ["B6892", "JBU892"],
      registration: "N584JB",
      modeS: "A7858E",
    },
  },
  {
    id: "departure-dal1254",
    direction: "departure",
    callsign: "",
    flightNumber: "1254",
    airline: { iata: "DL", icao: "DAL", name: "Delta Air Lines" },
    origin: { icao: "KBOS", iata: "BOS" },
    destination: { icao: "KATL", iata: "ATL" },
    scheduledTimeLocal: "2026-05-14 16:00-04:00",
    aircraft: { registration: "", modeS: "" },
    matchKeys: {
      callsign: "",
      flightNumber: "1254",
      convertedCallsigns: ["DL1254", "DAL1254"],
      registration: "",
      modeS: "",
    },
  },
  {
    id: "departure-unknown",
    direction: "departure",
    callsign: "",
    flightNumber: "7701",
    airline: { iata: "AA", icao: "AAL", name: "American Airlines" },
    origin: { icao: "KBOS", iata: "BOS" },
    destination: { icao: "KDCA", iata: "DCA" },
    scheduledTimeLocal: "2026-05-14 15:25-04:00",
    aircraft: { registration: "", modeS: "" },
    matchKeys: {
      callsign: "",
      flightNumber: "7701",
      convertedCallsigns: ["AA7701", "AAL7701"],
      registration: "",
      modeS: "",
    },
  },
];

const modeSMatch = matchAirportFidsAircraft(
  {
    hex: "a7858e",
    flight: "JBU892  ",
    r: "N584JB",
    lat: 42.31,
    lon: -70.94,
    track: 290,
    gs: 210,
  },
  airportFidsFlights,
  {
    focusAirport,
    now: new Date("2026-05-14T18:10:00Z"),
  },
);

assert.equal(modeSMatch.matchMethod, "icao24");
assert.equal(modeSMatch.confidence, "high");
assert.equal(modeSMatch.matchedFlightId, "arrival-jbu892");
assert.equal(modeSMatch.origin.icao, "KTPA");
assert.equal(modeSMatch.destination.icao, "KBOS");

const convertedCallsignMatch = matchAirportFidsAircraft(
  {
    hex: "abc123",
    flight: "DAL1254",
    r: "",
    lat: 42.37,
    lon: -71.02,
    track: 210,
    gs: 190,
  },
  airportFidsFlights,
  {
    focusAirport,
    now: new Date("2026-05-14T19:45:00Z"),
  },
);

assert.equal(convertedCallsignMatch.matchMethod, "callsign-iata-icao-converted");
assert.equal(convertedCallsignMatch.confidence, "medium");
assert.equal(convertedCallsignMatch.matchedFlightId, "departure-dal1254");

const scoredMatch = matchAirportFidsAircraft(
  {
    hex: "def456",
    flight: "",
    r: "",
    lat: 42.38,
    lon: -71.03,
    track: 205,
    gs: 160,
  },
  airportFidsFlights,
  {
    focusAirport,
    now: new Date("2026-05-14T19:20:00Z"),
  },
);

assert.equal(scoredMatch.matchMethod, "route-time-position-score");
assert.equal(scoredMatch.confidence, "low");
assert.equal(scoredMatch.matchedFlightId, "departure-unknown");

const assignment = matchAirportFidsAircraftList(
  [
    { hex: "a7858e", flight: "JBU892", r: "N584JB", lat: 42.31, lon: -70.94 },
    { hex: "abc123", flight: "DAL1254", r: "", lat: 42.37, lon: -71.02 },
  ],
  airportFidsFlights,
  {
    focusAirport,
    now: new Date("2026-05-14T19:45:00Z"),
  },
);

assert.equal(assignment.matches.length, 2);
assert.equal(assignment.matches[0].source, "aerodatabox-airport-fids");
assert.equal(assignment.summary.high, 1);
assert.equal(assignment.summary.medium, 1);
assert.equal(assignment.summary.unmatched, 0);
