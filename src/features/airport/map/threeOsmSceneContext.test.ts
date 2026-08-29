import assert from "node:assert/strict";
import {
  collectAirspaceLineCoordinates,
  createThreeOsmContextScene,
} from "./threeOsmSceneContext";
import { lonLatToTileCoordinate } from "./threeOsmProjection";

const ring = [
  [-71.1, 42.3],
  [-71.0, 42.3],
  [-71.1, 42.3],
];

assert.deepEqual(
  collectAirspaceLineCoordinates({ type: "Polygon", coordinates: [ring] }),
  [ring],
);
assert.deepEqual(
  collectAirspaceLineCoordinates({
    type: "MultiPolygon",
    coordinates: [[ring], [ring]],
  }),
  [ring, ring],
);
assert.deepEqual(
  collectAirspaceLineCoordinates({ type: "LineString", coordinates: ring }),
  [],
);

const context = createThreeOsmContextScene({
  airportCode: "BOS",
  airports: [{ iata: "OWD", lat: 42.19, lon: -71.17 }],
  runwayCollection: {
    features: [
      {
        geometry: {
          coordinates: [
            [-71.02, 42.36],
            [-70.99, 42.37],
          ],
        },
      },
    ],
  },
  airspaceFeatures: [{ geometry: { type: "Polygon", coordinates: [ring] } }],
  showAirspaces: true,
  navaids: [{ id: "bos-vor", ident: "BOS", lat: 42.35, lon: -70.99 }],
  navaidCounts: [],
  useNavaidCounts: false,
  reportingPoints: [{ id: "point-1", name: "POINT", lat: 42.34, lon: -71.04 }],
  candidateWatchingSpots: [{ id: "spot-1", name: "Beach", lat: 42.36, lon: -71.02 }],
  showNavaidMarkers: true,
  showReportingPoints: true,
  showCandidateWatchingSpots: true,
  selectedNavaidKey: "",
  selectedReportingPointKey: "",
  selectedCandidateWatchingSpotId: "",
  userLocation: { lat: 42.37, lon: -71.01 },
  tileCenter: lonLatToTileCoordinate(-71.0096, 42.3656, 10),
  centerLat: 42.3656,
  theme: "dark",
});
assert.deepEqual(context.counts, {
  airports: 1,
  runways: 1,
  airspaces: 1,
  navaids: 1,
  reportingPoints: 1,
  spots: 1,
  userLocation: 1,
});
assert.ok(context.labels.some((label) => label.text === "BOS"));
assert.ok(context.labels.some((label) => label.text === "OWD"));
assert.ok(context.group.getObjectByName("three-osm-airspace-boundaries"));

const chineseCounts = createThreeOsmContextScene({
  airportCode: "BOS",
  airports: [],
  runwayCollection: null,
  airspaceFeatures: [],
  showAirspaces: false,
  navaids: [],
  navaidCounts: [{ key: "tile", count: 3, lat: 42.35, lon: -70.99 }],
  useNavaidCounts: true,
  reportingPoints: [],
  candidateWatchingSpots: [],
  showNavaidMarkers: true,
  showReportingPoints: false,
  showCandidateWatchingSpots: false,
  selectedNavaidKey: "",
  selectedReportingPointKey: "",
  selectedCandidateWatchingSpotId: "",
  userLocation: null,
  tileCenter: lonLatToTileCoordinate(-71.0096, 42.3656, 10),
  centerLat: 42.3656,
  theme: "dark",
  locale: "zh-CN",
});
assert.ok(chineseCounts.labels.some((label) => label.text === "3 导航台"));

console.log("threeOsmSceneContext.test.ts ok");
