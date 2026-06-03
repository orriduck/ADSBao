import assert from "node:assert/strict";

import {
  buildCandidateWatchingSpotFile,
  buildOverpassQuery,
  buildRunwayExtensionCorridors,
  filterAndScoreCandidateElements,
} from "./candidateWatchingSpotsModel";

const runwayMap = {
  airport: "KAAA",
  source: "Test",
  runways: [
    {
      id: "09/27",
      ends: [
        { ident: "09", lat: 42, lon: -71.02 },
        { ident: "27", lat: 42, lon: -71 },
      ],
    },
  ],
};

const corridors = buildRunwayExtensionCorridors(runwayMap, {
  extensionMeters: 2000,
  lateralBufferMeters: 220,
});

assert.equal(corridors.length, 2);
assert.equal(corridors[0].runwayId, "09/27");
assert.equal(corridors[0].end, "09");
assert.ok(corridors[0].bbox.south < 42);
assert.ok(corridors[0].bbox.west < -71.02);

const query = buildOverpassQuery({
  south: 41.9,
  west: -71.1,
  north: 42.1,
  east: -70.9,
});

assert.ok(query.includes("[out:json][timeout:25];"));
assert.ok(query.includes('nwr["tourism"="viewpoint"](41.900000,-71.100000,42.100000,-70.900000);'));
assert.ok(query.includes("out center tags;"));

const scored = filterAndScoreCandidateElements({
  airportIcao: "KAAA",
  airportCenter: { lat: 42, lon: -71.01 },
  runwayMap,
  elements: [
    {
      type: "node",
      id: 101,
      lat: 42,
      lon: -71.043,
      tags: {
        tourism: "viewpoint",
        name: "Public View",
      },
    },
    {
      type: "node",
      id: 102,
      lat: 42,
      lon: -71.044,
      tags: {
        tourism: "viewpoint",
        access: "private",
        name: "Private View",
      },
    },
    {
      type: "node",
      id: 104,
      lat: 42,
      lon: -71.041,
      tags: {
        amenity: "bench",
        access: "no",
      },
    },
    {
      type: "node",
      id: 105,
      lat: 42,
      lon: -71.042,
      tags: {
        highway: "footway",
        foot: "no",
      },
    },
    {
      type: "node",
      id: 106,
      lat: 42,
      lon: -71.04,
      tags: {
        highway: "footway",
      },
    },
    {
      type: "node",
      id: 103,
      lat: 42.08,
      lon: -71.08,
      tags: {
        amenity: "parking",
      },
    },
  ],
  now: "2026-06-02T12:00:00.000Z",
  limit: 5,
});

assert.equal(scored.length, 2);
assert.equal(scored[0].id, "osm-node-101");
assert.equal(scored[1].id, "osm-node-106");
assert.ok(scored[0].score > scored[1].score);
assert.equal(scored[0].sourceObjectId, "101");
assert.equal(scored[0].source, "osm");
assert.equal(scored[0].osmType, "node");
assert.equal(scored[0].runwayAlignment?.runwayId, "09/27");
assert.equal(scored[0].runwayAlignment?.end, "09");
assert.ok(scored[0].score > 0);
assert.ok(scored[0].reason.includes("runway"));
assert.ok(scored[0].disclaimer.includes("map-derived candidate"));

const file = buildCandidateWatchingSpotFile({
  airportIcao: "kaaa",
  spots: scored,
  generatedAt: "2026-06-02T12:00:00.000Z",
});

assert.equal(file.airportIcao, "KAAA");
assert.equal(file.generatedAt, "2026-06-02T12:00:00.000Z");
assert.equal(file.sourceAttribution, "© OpenStreetMap contributors");
assert.equal(file.spots.length, 2);

console.log("candidateWatchingSpotsModel.test.ts ok");
