import assert from "node:assert/strict";

import {
  buildAerodataboxFlightRouteResponse,
  buildAerodataboxFlightUrl,
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

assert.equal(
  buildAerodataboxFlightRouteResponse("BAW213", aerodataboxFlights, {
    icao: "KJFK",
    iata: "JFK",
  }),
  null,
);
