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
  client: {
    async listAirports(options) {
      calls.push(options);
      return {
        items: [
        {
          _id: "cyyz",
          icaoCode: "CYYZ",
          iataCode: "YYZ",
          name: "Toronto Pearson International Airport",
          country: "CA",
          geometry: { type: "Point", coordinates: [-79.6306, 43.6772] },
          runways: [
            {
              _id: "cyyz-rw",
              designator: "05",
              trueHeading: 50,
              dimension: { length: { value: 3389 }, width: { value: 60 } },
            },
          ],
        },
        {
          _id: "cytz",
          icaoCode: "CYTZ",
          iataCode: "YTZ",
          name: "Billy Bishop Toronto City Centre Airport",
          country: "CA",
          geometry: { type: "Point", coordinates: [-79.3962, 43.6275] },
          runways: [
            {
              _id: "cytz-rw",
              designator: "08",
              trueHeading: 80,
              dimension: { length: { value: 1216 }, width: { value: 45 } },
            },
          ],
        },
        ],
      };
    },
  },
});

assert.equal(payload.source, "openaip");
assert.equal(payload.airports[0].icao, "CYTZ");
assert.equal(payload.airports[0].country, "CA");
assert.equal(payload.airports[0].runwayMap, null);
assert.deepEqual(
  payload.airports.map((airport) => airport.icao),
  ["CYTZ", "CYYZ"],
);
assert.equal(calls.length, 1);
assert.equal(calls[0].pos, "43.73,-79.45");
assert.equal(calls[0].dist, 74080);
assert.equal(calls[0].type, "0,2,3,9,10,11,13");
assert.equal(calls[0].limit, 61);

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
      client: {
        async listAirports() {
          return {
            items: [
            {
              _id: "cyyz",
              icaoCode: "CYYZ",
              iataCode: "YYZ",
              name: "Toronto Pearson International Airport",
              country: "CA",
              geometry: { type: "Point", coordinates: [-79.6306, 43.6772] },
            },
            ],
          };
        },
      },
    });

    assert.equal(quietPayload.source, "openaip");
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
  }),
  /OpenAIP API key is not configured/,
);

console.log("nearbyAirports.mechanism.test.ts ok");
