import assert from "node:assert/strict";

import { buildNavaidLabels } from "./navaidLabelModel";

const navaids = [
  {
    id: 86260,
    ident: "BOS",
    name: "Boston",
    type: "VORTAC",
    lat: 42.3573989868164,
    lon: -70.989501953125,
    frequencyKhz: 112700,
    distanceNm: 0.86,
  },
  {
    id: 86241,
    ident: "BO",
    name: "Miltt",
    type: "NDB",
    lat: 42.2737998962402,
    lon: -71.049201965332,
    frequencyKhz: 375,
    distanceNm: 5.6,
  },
  {
    id: 1,
    ident: "",
    name: "No Ident",
    type: "NDB",
    lat: 42,
    lon: -71,
  },
  {
    id: 2,
    ident: "BAD",
    name: "No Coordinates",
    type: "NDB",
    lat: null,
    lon: -71,
  },
];

assert.deepEqual(buildNavaidLabels(navaids), [
  {
    key: "86260-BOS",
    ident: "BOS",
    name: "Boston",
    type: "VORTAC",
    lat: 42.3573989868164,
    lon: -70.989501953125,
    frequencyKhz: 112700,
    distanceNm: 0.86,
    elevationFt: null,
    country: "",
    dme: null,
    usageType: "",
    power: "",
    associatedAirport: "",
    magneticVariationDeg: null,
    slavedVariationDeg: null,
  },
  {
    key: "86241-BO",
    ident: "BO",
    name: "Miltt",
    type: "NDB",
    lat: 42.2737998962402,
    lon: -71.049201965332,
    frequencyKhz: 375,
    distanceNm: 5.6,
    elevationFt: null,
    country: "",
    dme: null,
    usageType: "",
    power: "",
    associatedAirport: "",
    magneticVariationDeg: null,
    slavedVariationDeg: null,
  },
]);

console.log("navaidLabelModel.test.ts ok");
