import assert from "node:assert/strict";

import { buildReportingPointLabels } from "./reportingPointLabelModel";

assert.deepEqual(
  buildReportingPointLabels([
    {
      id: "rp-alpha",
      name: "ALPHA",
      lat: 42.37,
      lon: -71.02,
      compulsory: true,
    },
    {
      id: "rp-bad",
      name: "BRAVO",
      lat: null,
      lon: -71.01,
    },
    {
      id: "rp-empty",
      name: "",
      lat: 42.35,
      lon: -71.03,
    },
  ]),
  [
    {
      key: "rp-alpha-ALPHA",
      name: "ALPHA",
      lat: 42.37,
      lon: -71.02,
      compulsory: true,
      country: "",
      source: "",
    },
  ],
);

console.log("reportingPointLabelModel.test.ts ok");
