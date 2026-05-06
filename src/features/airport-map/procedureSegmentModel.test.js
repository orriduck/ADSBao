import assert from "node:assert/strict";

import {
  buildProcedureFixLabels,
  buildProcedureSegmentCollection,
  getProcedureSegmentStyle,
} from "./procedureSegmentModel.js";

const runwayProcedures = {
  airport: "KBOS",
  runwayDirections: [
    {
      runway: "04R",
      approaches: [
        {
          id: "kbos-r04r-rnav-gps-rwy-04r",
          procedureCode: "R04R",
          name: "RNAV (GPS) RWY 04R",
          final: [
            {
              sequence: 10,
              pathTerminator: "IF",
              fixIdent: "WINNI",
              point: { lat: 42.116864, lon: -71.124506 },
            },
            {
              sequence: 20,
              pathTerminator: "TF",
              fixIdent: "NABBO",
              point: { lat: 42.195189, lon: -71.087 },
            },
            {
              sequence: 30,
              pathTerminator: "TF",
              fixIdent: "RW04R",
              point: { lat: 42.35404, lon: -71.010352 },
              phase: "runway",
            },
          ],
          missed: [
            {
              sequence: 40,
              pathTerminator: "CA",
              unsupported: true,
              phase: "missed",
            },
            {
              sequence: 50,
              pathTerminator: "TF",
              fixIdent: "WAXEN",
              point: { lat: 42.584561, lon: -70.912969 },
              phase: "missed",
            },
          ],
        },
        {
          id: "kbos-l04r-loc-rwy-04r",
          procedureCode: "L04R",
          name: "LOC RWY 04R",
          final: [
            {
              sequence: 10,
              pathTerminator: "IF",
              fixIdent: "WINNI",
              point: { lat: 42.116864, lon: -71.124506 },
            },
            {
              sequence: 20,
              pathTerminator: "TF",
              fixIdent: "RW04R",
              point: { lat: 42.35404, lon: -71.010352 },
              phase: "runway",
            },
          ],
          missed: [],
        },
      ],
    },
  ],
};

const collection = buildProcedureSegmentCollection(runwayProcedures);

assert.equal(collection.type, "FeatureCollection");
assert.equal(collection.properties.opacityDirection, "toward-runway");
assert.equal(collection.features.length, 4);
assert.deepEqual(
  collection.features.map((feature) => [
    feature.properties.procedureCode,
    feature.properties.fixIdent,
    feature.properties.segmentOpacity,
  ]),
  [
    ["R04R", "NABBO", 0.34],
    ["R04R", "RW04R", 0.62],
    ["R04R", "WAXEN", 0.9],
    ["L04R", "RW04R", 0.9],
  ],
);
assert.equal(collection.features[0].properties.procedureCode, "R04R");
assert.equal(collection.features[2].properties.phase, "missed");
assert.deepEqual(
  buildProcedureFixLabels(runwayProcedures).map((label) => [
    label.procedureCode,
    label.fixIdent,
  ]),
  [
    ["R04R", "NABBO"],
    ["R04R", "RW04R"],
    ["R04R", "WAXEN"],
    ["L04R", "RW04R"],
  ],
);

assert.deepEqual(getProcedureSegmentStyle("light"), {
  color: "#244164",
  weight: 3.8,
  opacity: 0.72,
});
assert.deepEqual(getProcedureSegmentStyle("dark"), {
  color: "#8fb7d6",
  weight: 4.2,
  opacity: 0.78,
});
