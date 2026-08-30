import assert from "node:assert/strict";
import { buildThreeOsmAirspaceGeometry } from "./threeOsmAirspaceGeometry";
import { lonLatToTileCoordinate } from "./threeOsmProjection";

const center = lonLatToTileCoordinate(-71.0096, 42.3656, 10);
const denseRing = [
  [-71.02, 42.35],
  [-71.015, 42.35002],
  [-71.01, 42.35],
  [-71.00998, 42.355],
  [-71.01, 42.36],
  [-71.015, 42.35998],
  [-71.02, 42.36],
  [-71.02002, 42.355],
  [-71.02, 42.35],
];

const prepared = buildThreeOsmAirspaceGeometry({
  airspaceFeatures: [{
    properties: {
      id: "bos-class-b",
      name: "BOSTON CLASS B",
      classLabel: "B",
      accessLevel: "controlled",
      lowerLimit: { value: 2000, unit: 1, referenceDatum: 1 },
      upperLimit: { value: 7000, unit: 1, referenceDatum: 1 },
      verticalLimit: "2000 ft MSL - 7000 ft MSL",
    },
    geometry: { type: "Polygon", coordinates: [denseRing] },
  }],
  showAirspaces: true,
  tileCenter: center,
  centerLat: 42.3656,
  zoom: 10,
});

assert.equal(prepared.features, 1);
assert.equal(prepared.rawSegments, 8);
assert.ok(prepared.segments < prepared.rawSegments);
assert.equal(prepared.featuresByTier["terminal-controlled"], 1);
assert.equal(prepared.featuresByAltitudeBand.low, 1);
assert.equal(
  prepared.segmentIdsByTier["terminal-controlled"].length,
  prepared.segments,
);
assert.equal(
  prepared.featuresById["bos-class-b"].positions.length / 6,
  prepared.segments,
);
assert.equal(
  prepared.featuresById["bos-class-b"].label,
  "BOSTON CLASS B · B · 2000 ft MSL - 7000 ft MSL",
);
assert.equal(prepared.featuresById["bos-class-b"].lowerAltitudeFt, 2000);
assert.equal(prepared.featuresById["bos-class-b"].upperAltitudeFt, 7000);
assert.ok(prepared.featuresById["bos-class-b"].cueHeightWorld > 40);
assert.ok(
  prepared.featuresById["bos-class-b"].labelPosition.y >
  prepared.featuresById["bos-class-b"].cueTopY,
);
assert.ok(Number.isFinite(prepared.featuresById["bos-class-b"].cueAnchor.x));

const hidden = buildThreeOsmAirspaceGeometry({
  airspaceFeatures: [],
  showAirspaces: false,
  tileCenter: center,
  centerLat: 42.3656,
  zoom: 14,
});
assert.equal(hidden.features, 0);
assert.equal(hidden.rawSegments, 0);
assert.equal(hidden.segments, 0);
assert.equal(hidden.simplificationTolerance, 0.1);

console.log("threeOsmAirspaceGeometry.test.ts ok");
