import assert from "node:assert/strict";

import { getOpenAipAirportPage, searchOpenAipAirports } from "./openAipDirectory";

const airports = await searchOpenAipAirports({
  query: "shanghai",
  ourAirportsNameRepository: null,
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

{
  const page = await getOpenAipAirportPage({
    ident: "KBOS",
    radiusNm: 60,
    nearbyLimit: 12,
    runwayGeometryRepository: null,
    ourAirportsNameRepository: null,
    facilityRepository: {
      async readFrequenciesByAirportIdent() {
        return [
          {
            id: 42,
            airportIdent: "KBOS",
            type: "TOWER",
            description: "BOSTON TOWER",
            frequencyMhz: 128.8,
            source: "ourairports",
          },
        ];
      },
      async readNavaidsNearAirport() {
        return [
          {
            id: 86260,
            ident: "BOS",
            name: "BOSTON",
            type: "VOR-DME",
            frequencyKhz: 112700,
            lat: 42.3576,
            lon: -70.9896,
            source: "ourairports",
          },
        ];
      },
    },
    client: {
      async listAirports({ search }: Record<string, any> = {}) {
        if (search === "KBOS") {
          return {
            items: [
              {
                _id: "openaip-kbos",
                name: "Logan International Airport",
                icaoCode: "KBOS",
                iataCode: "BOS",
                country: "US",
                type: 3,
                geometry: { type: "Point", coordinates: [-71.0096, 42.3656] },
                elevation: { value: 6, unit: 0 },
              },
            ],
          };
        }
        return { items: [] };
      },
      async getAirport() {
        return {
          _id: "openaip-kbos",
          name: "Logan International Airport",
          icaoCode: "KBOS",
          iataCode: "BOS",
          country: "US",
          type: 3,
          geometry: { type: "Point", coordinates: [-71.0096, 42.3656] },
          frequencies: [
            {
              _id: "openaip-twr",
              value: 128.8,
              type: "TWR",
              name: "Boston Tower",
            },
          ],
          runways: [],
        };
      },
      async listNavaids() {
        return {
          items: [
            {
              _id: "openaip-bos",
              name: "Boston",
              identifier: "BOS",
              type: 4,
              frequency: { value: 112.7 },
              geometry: { type: "Point", coordinates: [-70.9894, 42.3575] },
            },
          ],
        };
      },
      async listAirspaces() {
        return { items: [] };
      },
      async listReportingPoints() {
        return { items: [] };
      },
      async listObstacles() {
        return { items: [] };
      },
    },
  });

  assert.equal(page.frequencies.length, 1);
  assert.equal(page.frequencies[0].type, "tower");
  assert.deepEqual(page.frequencies[0].sources, ["openaip", "ourairports"]);
  assert.equal(page.nearbyNavaids.length, 1);
  assert.equal(page.nearbyNavaids[0].type, "vordme");
  assert.deepEqual(page.nearbyNavaids[0].sources, ["openaip", "ourairports"]);
}

console.log("openAipDirectory.test.ts: ok");
