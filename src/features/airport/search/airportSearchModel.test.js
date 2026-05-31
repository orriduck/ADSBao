import assert from "node:assert/strict";

import { AIRPORT_DISCOVERY_TOPICS } from "../../../config/airportDiscovery.js";
import {
  createAirportSelection,
  getAirportDiscoveryTopics,
  getNearbyAirportDisplayItems,
  getAirportResultCountLabel,
  mergeAirportSearchRows,
  resolveSubmittedAirport,
} from "./airportSearchModel.js";

const staticAirports = [
  { icao: "KBOS", iata: "BOS", name: "Boston Logan", city: "Boston" },
  { icao: "KLAX", iata: "LAX", name: "Los Angeles International" },
];

const remote = [
  { icao: "KBOS", iata: "BOS", name: "Duplicate Boston" },
  { icao: "KSEA", iata: "SEA", name: "Seattle-Tacoma" },
];

const rows = mergeAirportSearchRows({
  query: "bo",
  staticAirports,
  results: remote,
});

assert.equal(rows.length, 2);
assert.equal(rows[0].icao, "KBOS");
assert.equal(rows[0].name, "Boston Logan");
assert.equal(rows[1].icao, "KSEA");

const nearbyPromptItems = getNearbyAirportDisplayItems({
  airports: [{ icao: "KBOS", iata: "BOS", name: "Boston Logan" }],
  status: "idle",
});

assert.deepEqual(nearbyPromptItems, [
  {
    type: "nearby-prompt",
    id: "nearby-airports-prompt",
    status: "idle",
    errorMessage: "",
  },
]);

const nearbyResolvedItems = getNearbyAirportDisplayItems({
  airports: [{ icao: "KBOS", iata: "BOS", name: "Boston Logan" }],
  status: "resolved",
});

assert.equal(nearbyResolvedItems[0].type, "airport");
assert.equal(nearbyResolvedItems[0].airport.icao, "KBOS");

const discoveryTopics = getAirportDiscoveryTopics({
  topics: [
    {
      id: "spotter",
      titleKey: "search.discovery.spotterFavorites.title",
      airports: [{ icao: "KBOS" }, null, { name: "" }],
    },
    {
      id: "empty",
      titleKey: "search.discovery.empty.title",
      airports: [],
    },
  ],
});

assert.equal(discoveryTopics.length, 1);
assert.equal(discoveryTopics[0].id, "spotter");
assert.equal(discoveryTopics[0].airports.length, 1);

const configuredDiscoveryTopics = getAirportDiscoveryTopics({
  topics: AIRPORT_DISCOVERY_TOPICS,
});
const majorHubsTopic = configuredDiscoveryTopics.find(
  (topic) => topic.id === "major-international-hubs",
);
assert.deepEqual(
  majorHubsTopic.airports.map((airport) => airport.icao),
  ["KJFK", "EGLL", "VHHH", "KATL", "KORD"],
);

const worldOfAirportsTopic = configuredDiscoveryTopics.find(
  (topic) => topic.id === "world-of-airports",
);
assert.deepEqual(
  worldOfAirportsTopic.airports.map((airport) => airport.icao),
  ["KIAD", "SCEL", "VTBS"],
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

assert.equal(
  resolveSubmittedAirport({ query: "sea", rows, staticAirports }).icao,
  "KSEA",
);
assert.equal(
  resolveSubmittedAirport({ query: "lax", rows: [], staticAirports }).icao,
  "KLAX",
);
assert.equal(resolveSubmittedAirport({ query: "", rows, staticAirports }), null);

assert.equal(getAirportResultCountLabel({ loading: true, rowCount: 0 }), "loading");
assert.equal(getAirportResultCountLabel({ loading: false, rowCount: 1 }), "1 result");
assert.equal(getAirportResultCountLabel({ loading: false, rowCount: 3 }), "3 results");
