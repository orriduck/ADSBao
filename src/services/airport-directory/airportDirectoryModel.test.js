import assert from "node:assert/strict";

import {
  buildAirportDirectoryEndpoint,
  dedupeAirports,
  matchesAirportQuery,
  normalizeAirport,
  sortAirportsForQuery,
} from "./airportDirectoryModel.js";

const records = [
  {
    attributes: {
      icao_code: "KBOS",
      iata_code: "BOS",
      name: "Logan International Airport",
      municipality: "Boston",
      iso_country: "US",
      type: "large_airport",
      latitude: "42.3656",
      longitude: "-71.0096",
    },
  },
  {
    attributes: {
      icao_code: "KBOS",
      name: "Duplicate",
      latitude: "42",
      longitude: "-71",
    },
  },
  {
    attributes: {
      icao_code: "KORH",
      iata_code: "ORH",
      name: "Worcester Regional Airport",
      municipality: "Worcester",
      iso_country: "US",
      type: "medium_airport",
      latitude: "42.2673",
      longitude: "-71.8757",
    },
  },
];

const airports = records.map((record) => normalizeAirport(record));

assert.equal(airports[0].icao, "KBOS");
assert.equal(airports[0].type_label, "Large Airport");
assert.equal(airports[0].lat, 42.3656);
assert.deepEqual(dedupeAirports(airports).map((airport) => airport.icao), [
  "KBOS",
  "KORH",
]);
assert.equal(matchesAirportQuery(airports[0], "bos"), true);

assert.deepEqual(
  sortAirportsForQuery([airports[2], airports[0]], "bos").map((airport) => airport.icao),
  ["KBOS", "KORH"],
);

const endpoint = buildAirportDirectoryEndpoint({
  country: "US",
  queryType: "code",
  queryValue: "BOS",
  kind: "large_airport",
  cursor: "abc",
});

assert.equal(endpoint.searchParams.get("filter[code]"), "BOS");
assert.equal(endpoint.searchParams.get("filter[type]"), "large_airport");
assert.equal(endpoint.searchParams.get("page[cursor]"), "abc");
