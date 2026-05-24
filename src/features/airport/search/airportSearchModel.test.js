import assert from "node:assert/strict";

import {
  createAirportSelection,
  getFeaturedAirportDisplayItems,
  getAirportResultCountLabel,
  mergeAirportSearchRows,
  orderFeaturedAirportsByNearest,
  resolveSubmittedAirport,
} from "./airportSearchModel.js";

const featured = [
  { icao: "KBOS", iata: "BOS", name: "Boston Logan", city: "Boston" },
  { icao: "KLAX", iata: "LAX", name: "Los Angeles International" },
];

const remote = [
  { icao: "KBOS", iata: "BOS", name: "Duplicate Boston" },
  { icao: "KSEA", iata: "SEA", name: "Seattle-Tacoma" },
];

const rows = mergeAirportSearchRows({
  query: "bo",
  featuredAirports: featured,
  results: remote,
});

assert.equal(rows.length, 2);
assert.equal(rows[0].icao, "KBOS");
assert.equal(rows[0].name, "Boston Logan");
assert.equal(rows[1].icao, "KSEA");

const orderedFeatured = orderFeaturedAirportsByNearest({
  featuredAirports: [
    { icao: "KJFK", lat: 40.639447, lon: -73.779317 },
    { icao: "KLAX", lat: 33.942501, lon: -118.407997 },
    { icao: "KBOS", lat: 42.36197, lon: -71.0079 },
  ],
  location: { lat: 34.05, lon: -118.25 },
});

assert.deepEqual(
  orderedFeatured.map((airport) => airport.icao),
  ["KLAX", "KJFK", "KBOS"],
);

const unchangedFeatured = orderFeaturedAirportsByNearest({
  featuredAirports: featured,
  location: null,
});

assert.deepEqual(unchangedFeatured, featured);

const idleDisplayItems = getFeaturedAirportDisplayItems({
  featuredAirports: featured,
  locationStatus: "idle",
});

assert.equal(idleDisplayItems[0].type, "location-prompt");
assert.equal(idleDisplayItems[0].status, "idle");
assert.equal(idleDisplayItems[1].airport.icao, "KBOS");

const resolvedDisplayItems = getFeaturedAirportDisplayItems({
  featuredAirports: orderedFeatured,
  locationStatus: "resolved",
});

assert.deepEqual(
  resolvedDisplayItems.map((item) => item.airport.icao),
  ["KLAX", "KJFK", "KBOS"],
);

assert.deepEqual(
  createAirportSelection({
    icao: "KJFK",
    iata: "JFK",
    name: "John F. Kennedy International Airport",
    city: "New York",
    country: "US",
    lat: 40.6413,
    lon: -73.7781,
    type: "large_airport",
    type_label: "Large Airport",
  }),
  {
    code: "KJFK",
    icao: "KJFK",
    iata: "JFK",
    name: "John F. Kennedy International Airport",
    city: "New York",
    country: "US",
    lat: 40.6413,
    lon: -73.7781,
    type: "large_airport",
    type_label: "Large Airport",
  },
);

assert.equal(resolveSubmittedAirport({ query: "sea", rows, featuredAirports: featured }).icao, "KSEA");
assert.equal(resolveSubmittedAirport({ query: "lax", rows: [], featuredAirports: featured }).icao, "KLAX");
assert.equal(resolveSubmittedAirport({ query: "", rows, featuredAirports: featured }), null);

assert.equal(getAirportResultCountLabel({ loading: true, rowCount: 0 }), "loading");
assert.equal(getAirportResultCountLabel({ loading: false, rowCount: 1 }), "1 result");
assert.equal(getAirportResultCountLabel({ loading: false, rowCount: 3 }), "3 results");
