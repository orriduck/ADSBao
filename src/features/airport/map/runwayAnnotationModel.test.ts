import assert from "node:assert/strict";

import {
  buildRunwayApproachBeamCollection,
  buildRunwayCenterlineCollection,
  buildRunwayEndLabels,
  shouldShowRunwayEndLabels,
} from "./runwayAnnotationModel";
import {
  ZOOM_AIRPORT,
  ZOOM_APPROACH,
  ZOOM_DETAIL,
} from "../../../utils/airportMapDisplay";

const runwayMap = {
  airport: "KBOS",
  source: "OurAirports",
  cycle: "260514",
  runways: [
    {
      id: "04R/22L",
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

assert.equal(shouldShowRunwayEndLabels(ZOOM_APPROACH), false);
assert.equal(shouldShowRunwayEndLabels(ZOOM_AIRPORT), false);
assert.equal(shouldShowRunwayEndLabels(ZOOM_DETAIL), true);
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

const approachBeams = buildRunwayApproachBeamCollection(runwayMap, {
  zoom: ZOOM_APPROACH,
});
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

const airportBeam = buildRunwayApproachBeamCollection(runwayMap, {
  zoom: ZOOM_AIRPORT,
}).features[0];
assert.equal(airportBeam.properties.beamAngleDegrees, 12);
assert.equal(Math.round(airportBeam.properties.beamDistanceMeters), 5794);

const nearbyAirportBeam = buildRunwayApproachBeamCollection(runwayMap, {
  zoom: ZOOM_AIRPORT,
  distanceScale: 0.3,
}).features[0];
assert.equal(nearbyAirportBeam.properties.beamAngleDegrees, 12);
assert.equal(Math.round(nearbyAirportBeam.properties.beamDistanceMeters), 1738);

const detailBeam = buildRunwayApproachBeamCollection(runwayMap, {
  zoom: ZOOM_DETAIL,
}).features[0];
assert.equal(detailBeam.properties.beamAngleDegrees, 16);
assert.equal(Math.round(detailBeam.properties.beamDistanceMeters), 2334);
