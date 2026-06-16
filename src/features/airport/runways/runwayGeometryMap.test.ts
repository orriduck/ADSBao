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

// `lighted` and per-end `displacedThresholdFt` must survive into the runway
// object so FAA lighting can use them (previously dropped).
const litRunwayMap = buildRunwayMapFromGeometries({
  airport: "KBOS",
  runways: [
    {
      lengthFt: 7861,
      widthFt: 150,
      lighted: true,
      le: { ident: "22R", lat: 42.3745, lon: -70.999, displacedThresholdFt: 300 },
      he: { ident: "04L", lat: 42.3581, lon: -71.0142, displacedThresholdFt: 0 },
    },
  ],
});
assert.equal(litRunwayMap.runways[0].lighted, true);
const end22R = litRunwayMap.runways[0].ends.find((end) => end.ident === "22R");
assert.equal(end22R.displacedThresholdFt, 300);

// Missing `lighted` stays undefined (treated as lighted downstream, for OSM).
assert.equal(runwayMap.runways[0].lighted, undefined);

const openAipDirectionalRunwayMap = buildRunwayMapFromGeometries({
  airport: "KJFK",
  source: "OpenAIP",
  runways: [
    {
      id: "openaip-04L",
      lengthFt: 11348,
      widthFt: 200,
      closed: false,
      le: { ident: "04L", lat: 40.621, lon: -73.795 },
      he: { ident: "22R", lat: 40.651, lon: -73.765 },
    },
    {
      id: "openaip-22R",
      lengthFt: 11348,
      widthFt: 200,
      closed: false,
      le: { ident: "22R", lat: 40.651, lon: -73.765 },
      he: { ident: "04L", lat: 40.621, lon: -73.795 },
    },
    {
      id: "openaip-13L",
      lengthFt: 10000,
      widthFt: 200,
      closed: false,
      le: { ident: "13L", lat: 40.64, lon: -73.8 },
      he: { ident: "31R", lat: 40.62, lon: -73.75 },
    },
  ],
});

assert.equal(openAipDirectionalRunwayMap.airport, "KJFK");
assert.equal(openAipDirectionalRunwayMap.source, "OpenAIP");
assert.equal(openAipDirectionalRunwayMap.runways.length, 2);
assert.deepEqual(
  openAipDirectionalRunwayMap.runways.map((runway) => runway.id),
  ["04L/22R", "13L/31R"],
);
assert.deepEqual(
  openAipDirectionalRunwayMap.runways[0].centerline.geometry.coordinates,
  [
    [-73.795, 40.621],
    [-73.765, 40.651],
  ],
);

console.log("runwayGeometryMap.test.ts ok");
