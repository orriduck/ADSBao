import assert from "node:assert/strict";

import {
  buildAiracAirportIndexUrl,
  filterNearbyAirports,
  normalizeAiracAirport,
} from "./nearbyAirportModel.js";

const focus = {
  icao: "KJFK",
  lat: 40.639928,
  lon: -73.778692,
};

const airacRecord = {
  icao: "KLGA",
  lid: "LGA",
  name: "Laguardia",
  coordinates: { lat: 40.77725, lon: -73.872611 },
  elevation_ft: 21,
  city: "New York",
  state: "NY",
  country: "US",
};

assert.equal(
  buildAiracAirportIndexUrl({ country: "US", minRunwayLength: 5000, page: 2 }).toString(),
  "https://airac.net/api/v1/airports?country=US&min_runway_length=5000&per_page=100&page=2",
);

assert.deepEqual(normalizeAiracAirport(airacRecord), {
  icao: "KLGA",
  iata: "LGA",
  name: "Laguardia",
  city: "New York",
  state: "NY",
  country: "US",
  lat: 40.77725,
  lon: -73.872611,
  elevationFt: 21,
  source: "airac.net",
});

assert.equal(normalizeAiracAirport({ ...airacRecord, icao: "" }), null);
assert.equal(normalizeAiracAirport({ ...airacRecord, coordinates: {} }), null);

{
  const nearby = filterNearbyAirports({
    focus,
    airports: [
      normalizeAiracAirport({
        ...airacRecord,
        icao: "KJFK",
        lid: "JFK",
        coordinates: { lat: 40.639928, lon: -73.778692 },
      }),
      normalizeAiracAirport(airacRecord),
      normalizeAiracAirport({
        ...airacRecord,
        icao: "KEWR",
        lid: "EWR",
        name: "Newark Liberty International",
        coordinates: { lat: 40.6925, lon: -74.168667 },
      }),
      normalizeAiracAirport({
        ...airacRecord,
        icao: "KBOS",
        lid: "BOS",
        name: "General Edward Lawrence Logan International",
        coordinates: { lat: 42.362944, lon: -71.006389 },
      }),
    ],
    radiusNm: 30,
    limit: 3,
  });

  assert.deepEqual(
    nearby.map((airport) => airport.icao),
    ["KLGA", "KEWR"],
  );
  assert.equal(nearby[0].distanceNm < nearby[1].distanceNm, true);
  assert.equal(Number(nearby[0].distanceNm.toFixed(1)), 9.3);
}
