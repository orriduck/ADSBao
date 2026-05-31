import assert from "node:assert/strict";

import { getNearbyAirports } from "./nearbyAirports.mechanism";

const calls = [];

const payload = await getNearbyAirports({
  query: {
    lat: 43.73,
    lon: -79.45,
    icao: "",
    radiusNm: 40,
    limit: 12,
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
        {
          ident: "CYTZ",
          icao: "CYTZ",
          iata: "YTZ",
          name: "Billy Bishop Toronto City Centre Airport",
          country: "CA",
          lat: 43.6275,
          lon: -79.3962,
          distanceNm: 6.8,
        },
      ];
    },
    async getRunwaysByAirport(ident) {
      calls.push({ type: "runways", ident });
      if (ident === "CYTZ") {
        return [
          {
            lengthFt: 3988,
            closed: false,
            le: { ident: "08", lat: 43.627, lon: -79.404 },
            he: { ident: "26", lat: 43.628, lon: -79.386 },
          },
        ];
      }
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
  payload.airports.map((airport) => airport.icao),
  ["CYYZ", "CYTZ"],
);
assert.deepEqual(
  calls.map((call) => call.type),
  ["nearby", "runways", "runways"],
);
assert.deepEqual(calls[0].options, {
  lat: 43.73,
  lon: -79.45,
  radiusNm: 40,
  limit: 12,
  excludeIdent: "",
});

{
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args);
  try {
    const quietPayload = await getNearbyAirports({
      query: {
        lat: 43.73,
        lon: -79.45,
        icao: "",
        radiusNm: 40,
        limit: 12,
      },
      airportCache: {
        async read() {
          return null;
        },
        async write() {
          throw new Error(
            'Supabase nearby airport cache write failed (new row violates row-level security policy for table "nearby_airport_cache")',
          );
        },
      },
      ourAirportsQueries: {
        async getNearbyAirportsByPosition() {
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
        async getRunwaysByAirport() {
          return [];
        },
      },
    });

    assert.equal(quietPayload.source, "ourairports");
    assert.deepEqual(warnings, []);
  } finally {
    console.warn = originalWarn;
  }
}

await assert.rejects(
  getNearbyAirports({
    query: {
      lat: 43.73,
      lon: -79.45,
      icao: "",
      radiusNm: 40,
      limit: 12,
    },
    airportCache: null,
    ourAirportsQueries: null,
  }),
  /OurAirports nearby query layer is not configured/,
);

console.log("nearbyAirports.mechanism.test.ts ok");
