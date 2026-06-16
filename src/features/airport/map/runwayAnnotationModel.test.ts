import assert from "node:assert/strict";

import {
  buildRenderableAirportSurfaceFeatureCollection,
  buildRunwayApproachLightCollection,
  buildRunwayApproachVisualization,
  buildRunwayCenterlineCollection,
  buildRunwayEndLabels,
  buildRunwayMapFromSurfaceMap,
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
assert.equal(approachBeam.properties.beamAngleDegrees, 7);
assert.equal(Math.round(approachBeam.properties.beamDistanceMeters), 5150);
assert.equal(approachBeam.geometry.coordinates[0].length, 22);
assert.ok(
  metersBetween(
    approachBeam.geometry.coordinates[0][0],
    approachBeam.geometry.coordinates[0][1],
  ) >= 119,
);

const airportBeam = buildRunwayApproachVisualization(runwayMap, {
  zoom: ZOOM_AIRPORT,
}).data.features[0];
assert.equal(airportBeam.properties.beamAngleDegrees, 9);
assert.equal(Math.round(airportBeam.properties.beamDistanceMeters), 2012);

const nearbyAirportBeam = buildRunwayApproachVisualization(runwayMap, {
  zoom: ZOOM_AIRPORT,
  distanceScale: 0.3,
}).data.features[0];
assert.equal(nearbyAirportBeam.properties.beamAngleDegrees, 9);
assert.equal(Math.round(nearbyAirportBeam.properties.beamDistanceMeters), 604);

const detailBeam = buildRunwayApproachVisualization(runwayMap, {
  zoom: ZOOM_DETAIL,
}).data.features[0];
assert.equal(detailBeam.properties.beamAngleDegrees, 13);
assert.equal(Math.round(detailBeam.properties.beamDistanceMeters), 998);

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
assert.equal(runwayLights.features.length, 45);
const runwayStartCoordinate = runwayMap.runways[0].centerline.geometry
  .coordinates[0] as [any, any];
assert.deepEqual(
  [...new Set(runwayLights.features.map((feature) => feature.properties.side))],
  ["left", "right", "center"],
);
assert.equal(runwayLights.features[0].properties.progress, 0);
assert.equal(runwayLights.features.at(-1).properties.progress, 1);
assert.equal(runwayLights.features.at(-1).properties.kind, "centerline");
assert.ok(
  metersBetween(
    runwayLights.features[0].geometry.coordinates,
    runwayStartCoordinate,
  ) >= 20,
);
assert.ok(
  metersBetween(
    runwayLights.features[0].geometry.coordinates,
    runwayStartCoordinate,
  ) <= 26,
);
const approachLights = buildRunwayApproachLightCollection(runwayMap, {
  zoom: ZOOM_AIRPORT,
});
assert.equal(approachLights.features.length, 8);
assert.deepEqual(
  [...new Set(approachLights.features.map((feature) => feature.properties.runwayEnd))],
  ["04R", "22L"],
);
assert.equal(approachLights.features[0].properties.kind, "approach");
assert.ok(
  metersBetween(
    approachLights.features[0].geometry.coordinates,
    runwayStartCoordinate,
  ) > 90,
);

const surfaceMapFixture = {
  airport: "KBOS",
  source: "OpenStreetMap",
  sourceAttribution: "OpenStreetMap contributors",
  features: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [-71.005, 42.365],
            [-70.9991, 42.3773],
          ],
        },
        properties: {
          id: "osm-way-123",
          kind: "runway",
          ref: "04R/22L",
        },
      },
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [-71.009, 42.356],
            [-71.005, 42.365],
          ],
        },
        properties: {
          id: "osm-way-124",
          kind: "runway",
          ref: "4R/22L",
        },
      },
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [-71.0103, 42.354],
            [-71.009, 42.356],
          ],
        },
        properties: {
          id: "osm-way-125",
          kind: "runway",
          ref: "<nil>",
        },
      },
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [-71.01, 42.35],
            [-71.02, 42.36],
          ],
        },
        properties: {
          id: "osm-way-456",
          kind: "taxiway",
          ref: "A",
        },
      },
    ],
  },
};
const surfaceRunwayMap = buildRunwayMapFromSurfaceMap(
  surfaceMapFixture,
  runwayMap,
);
assert.equal(surfaceRunwayMap?.source, "OpenStreetMap");
assert.equal(surfaceRunwayMap?.runways.length, 1);
assert.equal(surfaceRunwayMap?.runways[0].id, "04R/22L");
assert.deepEqual(
  surfaceRunwayMap?.runways[0].ends.map((end) => end.ident),
  ["04R", "22L"],
);
assert.deepEqual(
  buildRunwayCenterlineCollection(surfaceRunwayMap).features[0].geometry
    .coordinates,
  [
    [-71.0103, 42.354],
    [-71.009, 42.356],
    [-71.005, 42.365],
    [-70.9991, 42.3773],
  ],
);
assert.ok(buildRunwayLightCollection(surfaceRunwayMap).features.length > 0);
const renderableSurface =
  buildRenderableAirportSurfaceFeatureCollection(surfaceMapFixture, runwayMap);
assert.deepEqual(
  renderableSurface?.features.map((feature) => feature.properties.id),
  ["osm-way-456", "osm-runway-04R-22L"],
);

assert.deepEqual(
  resolveRunwayAnnotationVisibility({
    showRunwayBeams: true,
  }),
  { showBeams: true, showBadges: true },
);
assert.deepEqual(
  resolveRunwayAnnotationVisibility({
    showRunwayBeams: false,
  }),
  { showBeams: false, showBadges: true },
);
