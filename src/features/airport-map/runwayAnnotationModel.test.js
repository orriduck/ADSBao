import assert from "node:assert/strict";

import {
  buildRunwayCenterlineCollection,
  buildRunwayEndLabels,
  shouldShowRunwayEndLabels,
} from "./runwayAnnotationModel.js";
import {
  ZOOM_AIRPORT,
  ZOOM_APPROACH,
  ZOOM_DETAIL,
} from "../../utils/airportMapDisplay.js";

const runwayMap = {
  airport: "KBOS",
  source: "FAA CIFP",
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
assert.equal(shouldShowRunwayEndLabels(ZOOM_AIRPORT), true);
assert.equal(shouldShowRunwayEndLabels(ZOOM_DETAIL), true);
assert.deepEqual(buildRunwayEndLabels(runwayMap, { zoom: ZOOM_APPROACH }), []);

assert.deepEqual(buildRunwayCenterlineCollection(runwayMap), {
  type: "FeatureCollection",
  properties: {
    airport: "KBOS",
    source: "FAA CIFP",
    cycle: "260514",
  },
  features: [runwayMap.runways[0].centerline],
});
