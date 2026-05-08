import assert from "node:assert/strict";

import { fetchAiracAirportIndex } from "./nearbyAirportDataClient.js";

{
  const calls = [];
  const payload = await fetchAiracAirportIndex({
    maxPages: 3,
    fetchImpl: async (url) => {
      calls.push(url.toString());
      return {
        ok: true,
        status: 200,
        async json() {
          return calls.length === 1
            ? {
                data: [
                  {
                    icao: "KJFK",
                    lid: "JFK",
                    name: "John F Kennedy International",
                    coordinates: { lat: 40.639928, lon: -73.778692 },
                    country: "US",
                  },
                ],
                pagination: { has_more: true },
              }
            : {
                data: [
                  {
                    icao: "KLGA",
                    lid: "LGA",
                    name: "Laguardia",
                    coordinates: { lat: 40.77725, lon: -73.872611 },
                    country: "US",
                  },
                ],
                pagination: { has_more: false },
              };
        },
      };
    },
  });

  assert.equal(calls.length, 2);
  assert.match(calls[0], /page=1$/);
  assert.match(calls[1], /page=2$/);
  assert.deepEqual(
    payload.airports.map((airport) => airport.icao),
    ["KJFK", "KLGA"],
  );
}

{
  await assert.rejects(
    fetchAiracAirportIndex({
      fetchImpl: async () => ({
        ok: false,
        status: 503,
        async json() {
          return {};
        },
      }),
    }),
    /AIRAC airport index request failed \(503\)/,
  );
}
