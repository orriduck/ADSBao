import assert from "node:assert/strict";

import {
  buildRunwayApproachVisualization,
  buildRunwayCenterlineCollection,
  buildRunwayEndLabels,
  buildRunwayLightCollection,
  resolveRunwayAnnotationVisibility,
} from "./runwayAnnotationModel";
import {
  ZOOM_AIRPORT,
  ZOOM_APPROACH,
  ZOOM_DETAIL,
} from "../../../utils/airportMapDisplay";
import { shouldShowRunwayEndLabelsForZoom } from "./airportMapZoomFeatures";

const runwayMap = {
  airport: "KBOS",
  source: "OurAirports",
  cycle: "260514",
  runways: [
    {
      id: "04R/22L",
      widthFt: 150,
      ends: [
        { ident: "04R", lat: 42.35404, lon: -71.010352 },
        { ident: "22L", lat: 42.377344, lon: -70.999076 },
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

const metersBetween = ([leftLon, leftLat], [rightLon, rightLat]) => {
  const metersPerDegreeLatitude = 111_320;
  const metersPerDegreeLongitude =
    metersPerDegreeLatitude * Math.cos((leftLat * Math.PI) / 180);
  const dx = (rightLon - leftLon) * metersPerDegreeLongitude;
  const dy = (rightLat - leftLat) * metersPerDegreeLatitude;
  return Math.hypot(dx, dy);
};

assert.deepEqual(buildRunwayEndLabels(runwayMap), [
  {
    key: "04R/22L-04R",
    runwayId: "04R/22L",
    ident: "04R",
    lat: 42.35404,
    lon: -71.010352,
  },
  {
    key: "04R/22L-22L",
    runwayId: "04R/22L",
    ident: "22L",
    lat: 42.377344,
    lon: -70.999076,
  },
]);

assert.equal(shouldShowRunwayEndLabelsForZoom(ZOOM_APPROACH), false);
assert.equal(shouldShowRunwayEndLabelsForZoom(ZOOM_AIRPORT), false);
assert.equal(shouldShowRunwayEndLabelsForZoom(ZOOM_DETAIL), true);
assert.deepEqual(buildRunwayEndLabels(runwayMap, { zoom: ZOOM_APPROACH }), []);
assert.deepEqual(buildRunwayEndLabels(runwayMap, { zoom: ZOOM_AIRPORT }), []);

assert.deepEqual(buildRunwayCenterlineCollection(runwayMap), {
  type: "FeatureCollection",
  properties: {
    airport: "KBOS",
    source: "OurAirports",
    cycle: "260514",
  },
  features: [runwayMap.runways[0].centerline],
});

const approachVisualization = buildRunwayApproachVisualization(runwayMap, {
  zoom: ZOOM_APPROACH,
});
assert.equal(approachVisualization.kind, "approach-beams");
const approachBeams = approachVisualization.data;
assert.equal(approachBeams.features.length, 2);
assert.deepEqual(
  approachBeams.features.map((feature) => feature.properties.runwayEnd),
  ["04R", "22L"],
);
assert.deepEqual(
  approachBeams.features.map((feature) => feature.geometry.type),
  ["Polygon", "Polygon"],
);

const approachBeam = approachBeams.features[0];
assert.equal(approachBeam.properties.beamAngleDegrees, 10);
assert.equal(Math.round(approachBeam.properties.beamDistanceMeters), 16093);
assert.equal(approachBeam.geometry.coordinates[0].length, 22);
assert.ok(
  metersBetween(
    approachBeam.geometry.coordinates[0][0],
    approachBeam.geometry.coordinates[0][1],
  ) >= 519,
);

const airportBeam = buildRunwayApproachVisualization(runwayMap, {
  zoom: ZOOM_AIRPORT,
}).data.features[0];
assert.equal(airportBeam.properties.beamAngleDegrees, 12);
assert.equal(Math.round(airportBeam.properties.beamDistanceMeters), 5794);

const nearbyAirportBeam = buildRunwayApproachVisualization(runwayMap, {
  zoom: ZOOM_AIRPORT,
  distanceScale: 0.3,
}).data.features[0];
assert.equal(nearbyAirportBeam.properties.beamAngleDegrees, 12);
assert.equal(Math.round(nearbyAirportBeam.properties.beamDistanceMeters), 1738);

const detailBeam = buildRunwayApproachVisualization(runwayMap, {
  zoom: ZOOM_DETAIL,
}).data.features[0];
assert.equal(detailBeam.properties.beamAngleDegrees, 16);
assert.equal(Math.round(detailBeam.properties.beamDistanceMeters), 2334);

const lightVisualization = buildRunwayApproachVisualization(runwayMap, {
  theme: "light",
  zoom: ZOOM_AIRPORT,
});
assert.equal(lightVisualization.kind, "approach-lines");
assert.deepEqual(
  lightVisualization.data.features.map((feature) => feature.geometry.type),
  ["LineString", "LineString"],
);

const nightVisualization = buildRunwayApproachVisualization(runwayMap, {
  theme: "night",
  zoom: ZOOM_AIRPORT,
});
assert.equal(nightVisualization.kind, "approach-beams");

const runwayLights = buildRunwayLightCollection(runwayMap);
assert.equal(runwayLights.features.length, 32);
assert.deepEqual(
  [...new Set(runwayLights.features.map((feature) => feature.properties.side))],
  ["left", "right"],
);
assert.equal(runwayLights.features[0].properties.progress, 0);
assert.equal(runwayLights.features.at(-1).properties.progress, 1);
assert.ok(
  metersBetween(
    runwayLights.features[0].geometry.coordinates,
    runwayMap.runways[0].centerline.geometry.coordinates[0],
  ) >= 20,
);
assert.ok(
  metersBetween(
    runwayLights.features[0].geometry.coordinates,
    runwayMap.runways[0].centerline.geometry.coordinates[0],
  ) <= 26,
);

assert.deepEqual(
  resolveRunwayAnnotationVisibility({
    immersiveModeActive: true,
    immersiveLocalMinutes: 20 * 60 + 59,
    immersivePhase: "dusk",
    showRunwayBeams: true,
  }),
  { showBeams: false, showBadges: false },
);
assert.deepEqual(
  resolveRunwayAnnotationVisibility({
    immersiveModeActive: true,
    immersiveLocalMinutes: 21 * 60,
    immersivePhase: "night",
    showRunwayBeams: false,
  }),
  { showBeams: true, showBadges: false },
);
assert.deepEqual(
  resolveRunwayAnnotationVisibility({
    immersiveModeActive: false,
    immersiveLocalMinutes: 21 * 60,
    immersivePhase: "night",
    showRunwayBeams: false,
  }),
  { showBeams: false, showBadges: true },
);
