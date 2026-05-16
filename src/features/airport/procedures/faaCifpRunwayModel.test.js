import assert from "node:assert/strict";

import {
  buildAirportRunwayMap,
  parseFaaCifpRunways,
} from "./faaCifpRunwayModel.js";

const kbosRunwayLines = [
  "SUSAP KBOSK6PR04R  RW04R001 0000W04A0N4221145450W07100372690-002230300N4222384380W07059566725106750056000512F400350365ED6E5393552004",
  "SUSAP KBOSK6PR09   RW09 001 0000W09A0N4221450000W07101150000-002230300N4221450000W07058500000106750056000512F400350365ED6E5393552004",
  "SUSAP KJFKK6PR04L  RW04L001 0000W04A0N4037000000W07347000000-002230300N4040000000W07344000000106750056000512F400350365ED6E5393552004",
];

const runways = parseFaaCifpRunways({
  lines: kbosRunwayLines,
  airport: "KBOS",
  cycle: "260514",
});

assert.equal(runways.airport, "KBOS");
assert.equal(runways.source, "FAA CIFP");
assert.equal(runways.cycle, "260514");
assert.deepEqual(
  runways.runways.map((runway) => runway.id),
  ["04R/22L", "09/27"],
);

const runway04R = runways.runways[0];
assert.deepEqual(
  runway04R.ends.map((end) => end.ident),
  ["04R", "22L"],
);
assert.equal(runway04R.centerline.type, "Feature");
assert.equal(runway04R.centerline.geometry.type, "LineString");
assert.deepEqual(runway04R.centerline.properties, {
  id: "04R/22L",
  airport: "KBOS",
  source: "FAA CIFP",
  ends: ["04R", "22L"],
});
assert.deepEqual(
  runway04R.centerline.geometry.coordinates.map(([lon, lat]) => [
    Number(lon.toFixed(6)),
    Number(lat.toFixed(6)),
  ]),
  [
    [-71.010352, 42.35404],
    [-70.999076, 42.377344],
  ],
);

const runwayMap = buildAirportRunwayMap({
  lines: kbosRunwayLines,
  airport: "kbos",
  cycle: "260514",
});

assert.deepEqual(
  runwayMap.runways.flatMap((runway) => runway.ends.map((end) => end.ident)),
  ["04R", "22L", "09", "27"],
);
