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

assert.equal(lineCollection.type, "FeatureCollection");
assert.equal(lineCollection.features.length, 1);
assert.equal(lineCollection.features[0].properties.fixIdent, "RW04R");
assert.equal(lineCollection.features[0].properties.fadeOpacity, 1);
assert.equal(lineCollection.features[0].geometry.coordinates.length > 2, true);

const darkStyles = getProcedureSilkStyles("dark");

assert.equal(darkStyles.length, 3);
assert.deepEqual(
  darkStyles.map((style) => style.color),
  ["#64748b", "#1e5f8f", "#9ccff0"],
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
  [0.05, 0.08, 0.14],
);
assert.equal(darkStyles[0].weight > darkStyles[1].weight, true);
assert.equal(darkStyles[1].weight > darkStyles[2].weight, true);

const renderLayers = buildProcedureRenderLayers(geojson, "dark");

assert.equal(renderLayers.length, 3);
assert.equal(renderLayers[0].geojson.features.length, 1);
assert.equal(renderLayers[0].style.opacity, 0.05);

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
  fadedCollection.features.map((feature) => feature.properties.fadeOpacity),
  [0.35, 1],
);
