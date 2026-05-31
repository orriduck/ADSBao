import assert from "node:assert/strict";

import { searchOpenAipAirports } from "./openAipDirectory";

const airports = await searchOpenAipAirports({
  query: "shanghai",
  client: {
    async listAirports() {
      return {
        items: [
          {
            _id: "6261555b5e9ded571045d58f",
            name: "Shanghai Pudong International Airport",
            icaoCode: "ZSPD",
            iataCode: "PVG",
            country: "CN",
            type: 3,
            geometry: { type: "Point", coordinates: [121.8052, 31.1434] },
          },
          {
            _id: "openaip-internal-shanghai-result",
            name: "Shanghai internal OpenAIP result",
            altIdentifier: "CN-SHANGHAI-LONG-ID",
            country: "CN",
            type: 2,
            geometry: { type: "Point", coordinates: [121.4, 31.2] },
          },
          {
            _id: "6261555b5e9ded571045d590",
            name: "Shanghai Hongqiao International Airport",
            icaoCode: "ZSSS",
            iataCode: "SHA",
            country: "CN",
            type: 3,
            geometry: { type: "Point", coordinates: [121.3363, 31.1979] },
          },
        ],
      };
    },
  },
});

assert.deepEqual(
  airports.map((airport) => airport.icao),
  ["ZSSS", "ZSPD"],
);
assert.ok(airports.every((airport) => airport.ident.length <= 4));

console.log("openAipDirectory.test.ts: ok");
