import assert from "node:assert/strict";

import { AIRPORT_DISCOVERY_TOPICS } from "../../../config/airportDiscovery";
import {
  createAirportSelection,
  getAirportDiscoveryTopics,
  getNearbyAirportDisplayItems,
  mergeAirportSearchRows,
  resolveHomeSearchDestination,
  resolveSubmittedAirport,
  resolveTrackableCallsign,
} from "./airportSearchModel";

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
  ["KJFK", "KLAX", "EGLL", "RKSI", "EDDF", "LFPG"],
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

assert.deepEqual(
  resolveHomeSearchDestination({ query: "DAL58", rows: [], staticAirports }),
  { type: "aircraft", callsign: "DAL58" },
);
assert.equal(
  resolveTrackableCallsign({ query: " dal 58 ", rows: [], staticAirports }),
  "DAL58",
);
assert.deepEqual(
  resolveHomeSearchDestination({ query: "lax", rows: [], staticAirports }),
  { type: "airport", airport: staticAirports[1] },
);

// City names must not unexpectedly open a flight tracking page on Enter.
assert.deepEqual(
  resolveHomeSearchDestination({ query: "Boston", rows: [staticAirports[0]], staticAirports }),
  { type: "airport", airport: staticAirports[0] },
);
assert.equal(resolveTrackableCallsign({ query: "Boston", rows: [staticAirports[0]] }), "");
assert.deepEqual(
  resolveHomeSearchDestination({ query: "DAL58", rows: [staticAirports[0]], staticAirports }),
  { type: "aircraft", callsign: "DAL58" },
);
assert.deepEqual(
  resolveHomeSearchDestination({ query: "GABCD", rows: [], staticAirports }),
  { type: "aircraft", callsign: "GABCD" },
);
