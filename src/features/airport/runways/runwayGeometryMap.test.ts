import assert from "node:assert/strict";

import { buildRunwayMapFromGeometries } from "./runwayGeometryMap";

assert.equal(buildRunwayMapFromGeometries({ airport: "KBOS", runways: [] }), null);

const runwayMap = buildRunwayMapFromGeometries({
  airport: "KBOS",
  source: "OurAirports",
  runways: [
    {
      lengthFt: 7861,
      widthFt: 150,
      closed: false,
      le: { ident: "22R", lat: 42.3745, lon: -70.999 },
      he: { ident: "04L", lat: 42.3581, lon: -71.0142 },
    },
    {
      closed: true,
      le: { ident: "01", lat: 42, lon: -71 },
      he: { ident: "19", lat: 42.1, lon: -71.1 },
    },
  ],
});

assert.equal(runwayMap.airport, "KBOS");
assert.equal(runwayMap.source, "OurAirports");
assert.equal(runwayMap.runways.length, 1);
assert.equal(runwayMap.runways[0].id, "04L/22R");
assert.deepEqual(
  runwayMap.runways[0].centerline.geometry.coordinates,
  [
    [-71.0142, 42.3581],
    [-70.999, 42.3745],
  ],
);
assert.deepEqual(runwayMap.runways[0].centerline.properties.ends, ["04L", "22R"]);

console.log("runwayGeometryMap.test.ts ok");
