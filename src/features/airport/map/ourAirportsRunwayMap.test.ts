import assert from "node:assert/strict";

import { buildRunwayMapFromOurAirports } from "./ourAirportsRunwayMap";

assert.equal(buildRunwayMapFromOurAirports("", []), null);
assert.equal(buildRunwayMapFromOurAirports("LFPG", []), null);
assert.equal(buildRunwayMapFromOurAirports("LFPG", null), null);

// Skip rows missing either threshold's lat/lon — keep working rows.
const result = buildRunwayMapFromOurAirports("LFPG", [
  {
    closed: false,
    le: { ident: "08L", lat: 48.9957, lon: 2.5527 },
    he: { ident: "26R", lat: 48.9988, lon: 2.6102 },
  },
  {
    // Closed runway: drop.
    closed: true,
    le: { ident: "08H", lat: 49.0158, lon: 2.5586 },
    he: { ident: "26H", lat: 49.0161, lon: 2.5646 },
  },
  {
    // Missing he coords: drop.
    closed: false,
    le: { ident: "09L", lat: 49.0247, lon: 2.5249 },
    he: { ident: "27R" },
  },
  {
    closed: false,
    le: { ident: "09R", lat: 49.0206, lon: 2.5131 },
    he: { ident: "27L", lat: 49.0237, lon: 2.5703 },
  },
]);

assert.equal(result.airport, "LFPG");
assert.equal(result.source, "OurAirports");
assert.equal(result.runways.length, 2);

// Runway pair id is "<lower-numbered-end>/<higher-numbered-end>".
assert.equal(result.runways[0].id, "08L/26R");
assert.equal(result.runways[1].id, "09R/27L");

// ends preserved with idents + coords.
assert.deepEqual(result.runways[0].ends[0], {
  ident: "08L",
  lat: 48.9957,
  lon: 2.5527,
});
assert.deepEqual(result.runways[0].ends[1], {
  ident: "26R",
  lat: 48.9988,
  lon: 2.6102,
});

// centerline is a LineString feature with [lon, lat] coords in end order.
assert.equal(result.runways[0].centerline.type, "Feature");
assert.equal(result.runways[0].centerline.geometry.type, "LineString");
assert.deepEqual(result.runways[0].centerline.geometry.coordinates, [
  [2.5527, 48.9957],
  [2.6102, 48.9988],
]);
assert.equal(result.runways[0].centerline.properties.source, "OurAirports");
assert.deepEqual(result.runways[0].centerline.properties.ends, ["08L", "26R"]);

// All-bad input returns null.
const empty = buildRunwayMapFromOurAirports("XXXX", [
  { closed: false, le: {}, he: {} },
  { closed: true, le: { ident: "01", lat: 0, lon: 0 }, he: { ident: "19", lat: 0, lon: 0 } },
]);
assert.equal(empty, null);

console.log("ourAirportsRunwayMap.test.ts: ok");
