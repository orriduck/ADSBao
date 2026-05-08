import assert from "node:assert/strict";

import {
  fetchAiracAirportDetail,
  fetchAiracAirportIndex,
} from "./nearbyAirportDataClient.js";

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
  const detail = await fetchAiracAirportDetail({
    icao: "klga",
    fetchImpl: async (url) => {
      assert.equal(url.toString(), "https://airac.net/api/v1/airports/KLGA");
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            data: {
              icao: "KLGA",
              lid: "LGA",
              name: "Laguardia",
              coordinates: { lat: 40.77725, lon: -73.872611 },
              country: "US",
              runways: [
                {
                  identifier: "04/22",
                  length_ft: 7003,
                  base_identifier: "04",
                  reciprocal_identifier: "22",
                  base_bearing: 40,
                },
              ],
            },
          };
        },
      };
    },
  });

  assert.equal(detail.icao, "KLGA");
  assert.equal(detail.runwayMap.runways.length, 1);
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
