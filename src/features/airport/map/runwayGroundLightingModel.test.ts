import assert from "node:assert/strict";

import { buildRunwayGroundLightingCollection } from "./runwayGroundLightingModel";

// A ~3 km straight runway near KBOS, north–south, ~60 m wide.
const runway = (overrides: Record<string, any> = {}) => ({
  id: "15R/33L",
  widthFt: 197, // ~60 m
  lighted: true,
  ends: [
    { ident: "15R", lat: 42.36, lon: -71.01 },
    { ident: "33L", lat: 42.387, lon: -71.01 },
  ],
  centerline: {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: [
        [-71.01, 42.36],
        [-71.01, 42.387],
      ],
    },
  },
  ...overrides,
});

const rolesOf = (fc: Record<string, any>) =>
  fc.features.map((f: Record<string, any>) => f.properties.role);

// Empty / missing input → empty collection.
assert.deepEqual(buildRunwayGroundLightingCollection(null).features, []);
assert.deepEqual(buildRunwayGroundLightingCollection({ runways: [] }).features, []);

// Unlighted runways are skipped.
assert.deepEqual(
  buildRunwayGroundLightingCollection({ runways: [runway({ lighted: false })] }).features,
  [],
);

const fc = buildRunwayGroundLightingCollection({ runways: [runway()] });
const roles = rolesOf(fc);

// Two edges × (amber, white, amber) = 4 amber caution + 2 white edge segments.
assert.equal(roles.filter((r: string) => r === "edge-caution").length, 4);
assert.equal(roles.filter((r: string) => r === "edge").length, 2);

// One centerline, two end bars, four REIL points per runway.
assert.equal(roles.filter((r: string) => r === "centerline").length, 1);
assert.equal(roles.filter((r: string) => r === "endbar").length, 2);
assert.equal(roles.filter((r: string) => r === "reil").length, 4);

// Every feature has a finite LineString/Point geometry.
for (const f of fc.features) {
  assert.ok(["LineString", "Point"].includes(f.geometry.type));
}

// The two edges sit on opposite sides of the -71.01 centerline.
const edges = fc.features.filter((f: Record<string, any>) => f.properties.role === "edge");
const edgeLons = edges.map((e: Record<string, any>) => e.geometry.coordinates[0][0]);
assert.ok(Math.min(...edgeLons) < -71.01, "one edge west of centerline");
assert.ok(Math.max(...edgeLons) > -71.01, "one edge east of centerline");

// The white middle stays dominant (> ~60% of the ~0.027° runway extent).
const whiteEdge = edges[0];
const [wa, wb] = whiteEdge.geometry.coordinates;
assert.ok(
  Math.abs(wb[1] - wa[1]) > 0.013,
  "white middle dominates the amber caution zones",
);

console.log("runwayGroundLightingModel: all assertions passed");
