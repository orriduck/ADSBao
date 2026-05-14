import assert from "node:assert/strict";

import {
  buildAerodataboxAirportFeedsHealthUrl,
  buildAerodataboxAirportFidsRelativeUrl,
  buildAerodataboxAirportFidsWindowUrl,
  flattenAirportFidsResponse,
  normalizeAirportFidsFeedCoverage,
} from "./airportFidsProxyModel.js";

assert.equal(
  buildAerodataboxAirportFidsRelativeUrl("kbos", {
    offsetMinutes: -180,
    durationMinutes: 720,
  }),
  "https://aerodatabox.p.rapidapi.com/flights/airports/icao/KBOS?offsetMinutes=-180&durationMinutes=720&direction=Both&withLeg=true&withCodeshared=true&withCargo=true&withPrivate=true&withLocation=false",
);

assert.equal(
  buildAerodataboxAirportFidsWindowUrl(
    "KBOS",
    "2026-05-14T12:00",
    "2026-05-14T18:00",
  ),
  "https://aerodatabox.p.rapidapi.com/flights/airports/icao/KBOS/2026-05-14T12%3A00/2026-05-14T18%3A00?withLeg=true&withCodeshared=true&withCargo=true&withPrivate=true&withLocation=false",
);

assert.equal(
  buildAerodataboxAirportFeedsHealthUrl("kbos"),
  "https://aerodatabox.p.rapidapi.com/health/services/airports/KBOS/feeds",
);

assert.deepEqual(
  normalizeAirportFidsFeedCoverage({
    flightSchedulesFeed: {
      service: "FlightSchedules",
      status: "OK",
      minAvailableLocalDate: "2025-05-13",
      maxAvailableLocalDate: "2027-05-12",
    },
    liveFlightUpdatesFeed: {
      service: "FlightLiveUpdates",
      status: "OK",
    },
    adsbUpdatesFeed: {
      service: "AdsbUpdates",
      status: "OKPartial",
    },
    generalAvailability: {
      minAvailableLocalDate: "2025-05-13",
      maxAvailableLocalDate: "2027-05-12",
    },
  }),
  {
    airportFeedsOk: true,
    flightSchedulesStatus: "OK",
    liveUpdatesStatus: "OK",
    adsbUpdatesStatus: "OKPartial",
    minAvailableLocalDate: "2025-05-13",
    maxAvailableLocalDate: "2027-05-12",
  },
);

const focusAirport = {
  icao: "KBOS",
  iata: "BOS",
  name: "Boston Logan",
  municipality: "Boston",
  country: "US",
  lat: 42.3656,
  lon: -71.0096,
};

const flights = flattenAirportFidsResponse(
  {
    arrivals: [
      {
        number: "B6 892",
        callSign: "JBU892",
        status: "Arrived",
        codeshareStatus: "IsOperator",
        aircraft: { reg: "N584JB", modeS: "A7858E", model: "Airbus A320" },
        airline: { name: "JetBlue", iata: "B6", icao: "JBU" },
        departure: {
          airport: {
            icao: "KTPA",
            iata: "TPA",
            name: "Tampa Intl",
            municipalityName: "Tampa",
            countryCode: "US",
            location: { lat: 27.9755, lon: -82.5332 },
          },
          scheduledTime: { local: "2026-05-14 11:13-04:00" },
        },
        arrival: {
          scheduledTime: { local: "2026-05-14 14:13-04:00" },
        },
      },
    ],
    departures: [
      {
        number: "DL 1254",
        callSign: "DAL1254",
        status: "Boarding",
        codeshareStatus: "IsOperator",
        aircraft: { reg: "N123DN", modeS: "ABCD12", model: "Airbus A321" },
        airline: { name: "Delta Air Lines", iata: "DL", icao: "DAL" },
        departure: {
          scheduledTime: { local: "2026-05-14 16:00-04:00" },
        },
        arrival: {
          airport: {
            icao: "KATL",
            iata: "ATL",
            name: "Atlanta",
            municipalityName: "Atlanta",
            countryCode: "US",
            location: { lat: 33.6407, lon: -84.4277 },
          },
          scheduledTime: { local: "2026-05-14 18:45-04:00" },
        },
      },
    ],
  },
  { focusAirport },
);

assert.equal(flights.length, 2);
assert.equal(flights[0].direction, "arrival");
assert.equal(flights[0].origin.icao, "KTPA");
assert.equal(flights[0].destination.icao, "KBOS");
assert.equal(flights[0].aircraft.modeS, "A7858E");
assert.equal(flights[0].matchKeys.callsign, "JBU892");
assert.deepEqual(flights[0].matchKeys.convertedCallsigns, ["B6892", "JBU892"]);

assert.equal(flights[1].direction, "departure");
assert.equal(flights[1].origin.icao, "KBOS");
assert.equal(flights[1].destination.icao, "KATL");
assert.equal(flights[1].scheduledTimeLocal, "2026-05-14 16:00-04:00");
