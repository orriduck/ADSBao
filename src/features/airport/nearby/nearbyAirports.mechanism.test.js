import assert from "node:assert/strict";

import { getNearbyAirports } from "./nearbyAirports.mechanism.js";

const calls = [];

const payload = await getNearbyAirports({
  query: {
    lat: 43.73,
    lon: -79.45,
    icao: "",
    radiusNm: 40,
    limit: 12,
    country: "US",
    minRunwayLength: 5000,
  },
  airportCache: null,
  ourAirportsQueries: {
    async getNearbyAirportsByPosition(options) {
      calls.push({ type: "nearby", options });
      return [
        {
          ident: "CYYZ",
          icao: "CYYZ",
          iata: "YYZ",
          name: "Toronto Pearson International Airport",
          country: "CA",
          lat: 43.6772,
          lon: -79.6306,
          distanceNm: 8.7,
        },
      ];
    },
    async getRunwaysByAirport(ident) {
      calls.push({ type: "runways", ident });
      return [
        {
          lengthFt: 11120,
          closed: false,
          le: { ident: "05", lat: 43.674, lon: -79.642 },
          he: { ident: "23", lat: 43.681, lon: -79.62 },
        },
      ];
    },
  },
});

assert.equal(payload.source, "ourairports");
assert.equal(payload.airports[0].icao, "CYYZ");
assert.equal(payload.airports[0].country, "CA");
assert.equal(payload.airports[0].runwayMap.airport, "CYYZ");
assert.deepEqual(
  calls.map((call) => call.type),
  ["nearby", "runways"],
);
assert.deepEqual(calls[0].options, {
  lat: 43.73,
  lon: -79.45,
  radiusNm: 40,
  limit: 96,
  excludeIdent: "",
});

console.log("nearbyAirports.mechanism.test.js ok");
