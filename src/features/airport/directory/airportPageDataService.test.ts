import assert from "node:assert/strict";

import { createAirportPageDataService } from "./airportPageDataService";

const calls = [];

const fakeQueries = {
  async getAirportByIdent(ident) {
    calls.push({ method: "getAirportByIdent", ident });
    if (String(ident).toUpperCase() === "MISSING") return null;
    return {
      ident: "KBOS",
      icao: "KBOS",
      iata: "BOS",
      name: "Boston Logan",
      city: "Boston",
      country: "US",
      lat: 42.3,
      lon: -71.0,
    };
  },
  async getRunwaysByAirport(ident) {
    calls.push({ method: "getRunwaysByAirport", ident });
    return [{ id: 1, airportIdent: ident, lengthFt: 10083 }];
  },
  async getFrequenciesByAirport(ident) {
    calls.push({ method: "getFrequenciesByAirport", ident });
    return [{ id: 1, airportIdent: ident, frequencyMhz: 128.8 }];
  },
  async getNearbyAirports({ ident, radiusNm, limit }) {
    calls.push({ method: "getNearbyAirports", ident, radiusNm, limit });
    return [{ icao: "KJFK", distanceNm: 180 }];
  },
  async getNearbyNavaids({ ident, radiusNm, limit }) {
    calls.push({ method: "getNearbyNavaids", ident, radiusNm, limit });
    return [{ ident: "BOS", distanceNm: 5 }];
  },
};

const service = createAirportPageDataService({ queries: fakeQueries });

const out = await service.getAirportPageData("kbos");
assert.equal(out.airport.icao, "KBOS");
assert.equal(out.runways.length, 1);
assert.equal(out.frequencies[0].frequencyMhz, 128.8);
assert.equal(out.nearbyAirports[0].icao, "KJFK");
assert.equal(out.nearbyNavaids[0].ident, "BOS");

const empty = await service.getAirportPageData("");
assert.equal(empty.airport, null);
assert.deepEqual(empty.runways, []);

const missing = await service.getAirportPageData("MISSING");
assert.equal(missing.airport, null);
assert.deepEqual(missing.nearbyAirports, []);

calls.length = 0;

const partialQueries = {
  ...fakeQueries,
  async getRunwaysByAirport() {
    throw new Error("boom");
  },
};
const partialService = createAirportPageDataService({ queries: partialQueries });
const partial = await partialService.getAirportPageData("KBOS");
assert.equal(partial.airport.icao, "KBOS");
assert.deepEqual(partial.runways, []);
assert.equal(partial.frequencies.length, 1);

console.log("airportPageDataService.test.ts: ok");
