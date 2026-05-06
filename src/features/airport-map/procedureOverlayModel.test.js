import assert from "node:assert/strict";

import {
  buildProcedureLineCollection,
  buildProcedureRenderLayers,
  getProcedureSilkStyles,
} from "./procedureOverlayModel.js";

const geojson = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-71, 42] },
      properties: { fixIdent: "NABBO", phase: "approach" },
    },
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-71, 42],
          [-70.9, 42.1],
        ],
      },
      properties: { fixIdent: "AAALL", phase: "approach", transitionName: "NUNZO" },
    },
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-70.95, 42.05],
          [-70.9, 42.1],
        ],
      },
      properties: { fixIdent: "RW04R", phase: "runway", transitionName: "FINAL" },
    },
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-70.9, 42.1],
          [-70.8, 42.2],
        ],
      },
      properties: { fixIdent: "WAXEN", phase: "missed", transitionName: "FINAL" },
    },
  ],
};

const lineCollection = buildProcedureLineCollection(geojson);
const lineStart = [-70.95, 42.05];
const lineEnd = [-70.9, 42.1];
const [curvedMidpoint] = lineCollection.features[6].geometry.coordinates;
const midpointCrossProduct =
  (lineEnd[0] - lineStart[0]) * (curvedMidpoint[1] - lineStart[1]) -
  (lineEnd[1] - lineStart[1]) * (curvedMidpoint[0] - lineStart[0]);

assert.equal(lineCollection.type, "FeatureCollection");
assert.equal(lineCollection.features.length, 12);
assert.equal(lineCollection.features[0].properties.fixIdent, "RW04R");
assert.equal(lineCollection.features[0].properties.fadeOpacity, 0.2);
assert.equal(lineCollection.features.at(-1).properties.fadeOpacity, 1);
assert.equal(lineCollection.features[0].geometry.coordinates.length, 2);
assert.equal(Math.abs(midpointCrossProduct) < 0.000001, true);

const darkStyles = getProcedureSilkStyles("dark");

assert.equal(darkStyles.length, 3);
assert.deepEqual(
  darkStyles.map((style) => style.color),
  ["#64748b", "#1f6f9f", "#a8d8f3"],
);
assert.deepEqual(
  darkStyles.map((style) => style.className),
  [
    "procedure-silk procedure-silk--blur",
    "procedure-silk procedure-silk--body",
    "procedure-silk procedure-silk--thread",
  ],
);
assert.deepEqual(
  darkStyles.map((style) => style.opacity),
  [0.065, 0.105, 0.18],
);
assert.equal(darkStyles[0].weight > darkStyles[1].weight, true);
assert.equal(darkStyles[1].weight > darkStyles[2].weight, true);

const renderLayers = buildProcedureRenderLayers(geojson, "dark");

assert.equal(renderLayers.length, 3);
assert.equal(renderLayers[0].geojson.features.length, 12);
assert.equal(renderLayers[0].style.opacity, 0.065);
assert.equal(renderLayers[0].geojson.features[0].properties.layerOpacity, 0.013);

const multiSegmentGeoJson = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-71.2, 42.0],
          [-71.1, 42.1],
        ],
      },
      properties: {
        procedureId: "p1",
        transitionName: "FINAL",
        phase: "approach",
        sequence: 10,
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-71.1, 42.1],
          [-71.0, 42.2],
        ],
      },
      properties: {
        procedureId: "p1",
        transitionName: "FINAL",
        phase: "runway",
        sequence: 30,
      },
    },
  ],
};

const fadedCollection = buildProcedureLineCollection(multiSegmentGeoJson);
assert.deepEqual(
  [
    fadedCollection.features[0].properties.fadeOpacity,
    fadedCollection.features[11].properties.fadeOpacity,
    fadedCollection.features[12].properties.fadeOpacity,
    fadedCollection.features.at(-1).properties.fadeOpacity,
  ],
  [0.2, 0.583, 0.617, 1],
);

const angledGeoJson = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 0],
        ],
      },
      properties: {
        procedureId: "p2",
        transitionName: "FINAL",
        phase: "approach",
        sequence: 10,
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [1, 0],
          [1, 1],
        ],
      },
      properties: {
        procedureId: "p2",
        transitionName: "FINAL",
        phase: "runway",
        sequence: 20,
      },
    },
  ],
};

const curvedCornerCollection = buildProcedureLineCollection(angledGeoJson);
assert.equal(curvedCornerCollection.features.length, 24);
assert.equal(curvedCornerCollection.features[6].geometry.coordinates[0][1] < -0.01, true);
assert.equal(curvedCornerCollection.features[18].geometry.coordinates[0][0] > 1.01, true);
