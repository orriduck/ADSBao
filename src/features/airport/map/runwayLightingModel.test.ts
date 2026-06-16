import assert from "node:assert/strict";

import {
  buildRunwayFaaLightCollection,
  buildTaxiwayLightCollection,
  runwayLightRadius,
} from "./runwayLightingModel";
import { runwayLightingLodForZoom } from "./airportMapZoomFeatures";
import { RUNWAY_FAA_LIGHTING_CONFIG } from "../../../config/airportMap";
import {
  ZOOM_AIRPORT,
  ZOOM_APPROACH,
  ZOOM_DETAIL,
} from "../../../utils/airportMapDisplay";

const FEET_TO_METERS = 0.3048;
const expectedCenterlineGapM = RUNWAY_FAA_LIGHTING_CONFIG.centerlineSpacingFt * FEET_TO_METERS;

const metersBetween = ([leftLon, leftLat], [rightLon, rightLat]) => {
  const metersPerDegreeLatitude = 111_320;
  const metersPerDegreeLongitude =
    metersPerDegreeLatitude * Math.cos((leftLat * Math.PI) / 180);
  const dx = (rightLon - leftLon) * metersPerDegreeLongitude;
  const dy = (rightLat - leftLat) * metersPerDegreeLatitude;
  return Math.hypot(dx, dy);
};

// KBOS 04R/22L — a long runway (~8500ft from these endpoints) so the symmetric
// color zones (white middle, red/amber ends) are all present.
const runwayMap = {
  airport: "KBOS",
  source: "OurAirports",
  cycle: "260514",
  runways: [
    {
      id: "04R/22L",
      lengthFt: 10083,
      widthFt: 150,
      lighted: true,
      ends: [
        { ident: "04R", lat: 42.35404, lon: -71.010352, displacedThresholdFt: 0 },
        { ident: "22L", lat: 42.377344, lon: -70.999076, displacedThresholdFt: 0 },
      ],
      centerline: {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [-71.010352, 42.35404],
            [-70.999076, 42.377344],
          ],
        },
        properties: { id: "04R/22L" },
      },
    },
  ],
};

// --- LOD bands keyed to the airport-map zoom breakpoints.
assert.equal(runwayLightingLodForZoom(ZOOM_APPROACH), "far");
assert.equal(runwayLightingLodForZoom(ZOOM_AIRPORT), "mid");
assert.equal(runwayLightingLodForZoom(ZOOM_AIRPORT + 1), "mid");
assert.equal(runwayLightingLodForZoom(ZOOM_DETAIL), "near");
assert.equal(runwayLightingLodForZoom(ZOOM_DETAIL + 2), "near");

// --- Far band renders no point lights (approach beams handled separately).
assert.equal(buildRunwayFaaLightCollection(runwayMap, { band: "far" }).features.length, 0);

// --- Near band produces a full light set.
const near = buildRunwayFaaLightCollection(runwayMap, { band: "near" });
assert.ok(near.features.length > 100, "near band should produce many lights");

const byRole = (collection, predicate) =>
  collection.features.filter((feature) => predicate(String(feature.properties.role)));

const centerlineFeatures = byRole(
  near,
  (role) => role.startsWith("centerline"),
);

// Centerline spacing ≈ 50ft (15.24m): consecutive in-order points are evenly
// spaced. Validates the arc-length walk, not chord interpolation.
const centerlineGaps = centerlineFeatures
  .slice(1)
  .map((feature, index) =>
    metersBetween(
      centerlineFeatures[index].geometry.coordinates,
      feature.geometry.coordinates,
    ),
  );
const avgGap = centerlineGaps.reduce((sum, gap) => sum + gap, 0) / centerlineGaps.length;
assert.ok(
  avgGap > expectedCenterlineGapM * 0.9 && avgGap < expectedCenterlineGapM * 1.1,
  `centerline avg gap ${avgGap} should be ≈${expectedCenterlineGapM}m`,
);

// --- Symmetric color transitions: ends red, middle white.
assert.equal(
  centerlineFeatures[0].properties.color,
  "red",
  "centerline light at the threshold should be red (last 1000ft)",
);
assert.equal(
  centerlineFeatures.at(-1).properties.color,
  "red",
  "centerline light at the far threshold should also be red",
);
const midCenterline = centerlineFeatures[Math.floor(centerlineFeatures.length / 2)];
assert.equal(
  midCenterline.properties.color,
  "white",
  "centerline light in the middle should be white",
);

// Edge lights: amber within the caution zone at the ends, white in the middle.
const edgeFeatures = byRole(near, (role) => role.startsWith("edge"));
assert.equal(edgeFeatures[0].properties.color, "amber", "edge light at the end should be amber");
const edgeWhite = edgeFeatures.filter((feature) => feature.properties.color === "white");
const edgeAmber = edgeFeatures.filter((feature) => feature.properties.color === "amber");
assert.ok(edgeWhite.length > 0 && edgeAmber.length > 0, "edge should have both white and amber");

// Threshold (green) + end (red) bars exist at both ends.
const greenBars = byRole(near, (role) => role === "threshold");
const redBars = byRole(near, (role) => role === "end");
assert.equal(greenBars.length, 10, "two green threshold bars of 5 lights each");
assert.equal(redBars.length, 10, "two red end bars of 5 lights each");
assert.ok(greenBars.every((f) => f.properties.color === "green"));
assert.ok(redBars.every((f) => f.properties.color === "red"));

// REIL flashing strobes only at the near band.
const reil = byRole(near, (role) => role === "reil");
assert.equal(reil.length, 4, "two REIL strobes per end");
assert.ok(reil.every((f) => f.properties.flashing === true && f.properties.color === "white"));

// --- Mid band: lights present, but no TDZL/REIL and a decimated centerline.
const mid = buildRunwayFaaLightCollection(runwayMap, { band: "mid" });
assert.equal(byRole(mid, (role) => role === "reil").length, 0, "no REIL at mid band");
assert.equal(byRole(mid, (role) => role === "tdz").length, 0, "no TDZL at mid band");
const midCenterlineCount = byRole(mid, (role) => role.startsWith("centerline")).length;
assert.ok(
  midCenterlineCount > 0 && midCenterlineCount < centerlineFeatures.length,
  "mid band centerline should be decimated",
);

// --- `lighted` gating: false suppresses, undefined (OSM) renders.
const unlit = { ...runwayMap, runways: [{ ...runwayMap.runways[0], lighted: false }] };
assert.equal(buildRunwayFaaLightCollection(unlit, { band: "near" }).features.length, 0);
const unknownLit = { ...runwayMap, runways: [{ ...runwayMap.runways[0], lighted: undefined }] };
assert.ok(
  buildRunwayFaaLightCollection(unknownLit, { band: "near" }).features.length > 0,
  "unknown lighting is treated as lighted",
);

// --- Arc-length walk handles multi-vertex (bent) centerlines evenly.
const bent = {
  airport: "TEST",
  runways: [
    {
      id: "01/19",
      lengthFt: 6000,
      widthFt: 100,
      ends: [
        { ident: "01", lat: 40.0, lon: -75.0 },
        { ident: "19", lat: 40.02, lon: -74.99 },
      ],
      centerline: {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [-75.0, 40.0],
            [-74.995, 40.01],
            [-74.99, 40.02],
          ],
        },
        properties: { id: "01/19" },
      },
    },
  ],
};
const bentCenterline = byRole(
  buildRunwayFaaLightCollection(bent, { band: "near" }),
  (role) => role.startsWith("centerline"),
);
const bentGaps = bentCenterline
  .slice(1)
  .map((feature, index) =>
    metersBetween(
      bentCenterline[index].geometry.coordinates,
      feature.geometry.coordinates,
    ),
  );
assert.ok(
  bentGaps.every(
    (gap) => gap > expectedCenterlineGapM * 0.8 && gap < expectedCenterlineGapM * 1.2,
  ),
  `bent-centerline gaps stay near ${expectedCenterlineGapM}m (arc-length walk)`,
);

// --- Taxiway lights: near band only, green centerline + blue edge.
const surface = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { kind: "taxiway" },
      geometry: {
        type: "LineString",
        coordinates: [
          [-71.01, 42.36],
          [-71.0, 42.365],
        ],
      },
    },
  ],
};
assert.equal(
  buildTaxiwayLightCollection(surface, { band: "far" }).features.length,
  0,
  "no taxiway lights at far band",
);
assert.equal(
  buildTaxiwayLightCollection(surface, { band: "mid" }).features.length,
  0,
  "no taxiway lights at mid band",
);
const taxiwayNear = buildTaxiwayLightCollection(surface, { band: "near" });
assert.ok(
  taxiwayNear.features.some((f) => f.properties.color === "green"),
  "taxiway has green centerline",
);
assert.ok(
  taxiwayNear.features.some((f) => f.properties.color === "blue"),
  "taxiway has blue edge",
);

// --- Radius lookup returns a finite size per role.
const radiusRoles = ["edge", "centerline", "tdz", "reil", "approach", "taxiway-centerline"] as const;
for (const role of radiusRoles) {
  assert.ok(Number.isFinite(runwayLightRadius(role)), `radius for ${role}`);
}

console.log("runwayLightingModel.test.ts ok");
