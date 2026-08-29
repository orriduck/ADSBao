import assert from "node:assert/strict";
import * as THREE from "three";
import {
  collectAirspaceLineCoordinates,
  createThreeOsmContextScene,
  resolveThreeOsmAirspaceHitIds,
  resolveThreeOsmContextScreenHit,
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
  airports: [
    { icao: "KOWD", iata: "OWD", lat: 42.19, lon: -71.17 },
    { icao: "KBAD", iata: "BAD", lat: null, lon: null },
  ],
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
  airspaceFeatures: [{
    properties: { id: "bos-class-b", name: "BOSTON CLASS B", classLabel: "B" },
    geometry: { type: "Polygon", coordinates: [ring] },
  }],
  showAirspaces: true,
  navaids: [{ id: "bos-vor", ident: "BOS", lat: 42.35, lon: -70.99 }],
  navaidCounts: [],
  useNavaidCounts: false,
  reportingPoints: [{ id: "point-1", name: "POINT", lat: 42.34, lon: -71.04 }],
  candidateWatchingSpots: [{ id: "spot-1", name: "Beach", lat: 42.36, lon: -71.02 }],
  showNavaidMarkers: true,
  showReportingPoints: true,
  showCandidateWatchingSpots: true,
  selectedAirportIcao: "KOWD",
  selectedNavaidKey: "",
  selectedReportingPointKey: "",
  selectedCandidateWatchingSpotId: "",
  userLocation: { lat: 42.37, lon: -71.01 },
  tileCenter: lonLatToTileCoordinate(-71.0096, 42.3656, 10),
  centerLat: 42.3656,
  theme: "dark",
  contrastMode: "standard",
  selectedAirspaceId: "bos-class-b",
});
assert.deepEqual(context.counts, {
  airports: 1,
  runways: 1,
  airspaces: 1,
  selectedAirspaces: 1,
  navaids: 1,
  reportingPoints: 1,
  spots: 1,
  userLocation: 1,
});
assert.deepEqual(context.runwayDiagnostics, { segments: 1, vertices: 6 });
assert.ok(context.labels.some((label) => label.text === "BOS"));
assert.ok(context.labels.some((label) => label.text === "OWD"));
assert.ok(context.labels.some((label) => label.text === "OWD" && label.selected));
assert.ok(context.group.getObjectByName("three-osm-airspace-boundaries"));
assert.ok(context.group.getObjectByName("three-osm-selected-airspace-boundary"));
assert.ok(context.group.getObjectByName("three-osm-runway-halo"));
assert.ok(context.group.getObjectByName("three-osm-runway-surfaces"));
assert.ok(context.labels.some((label) => label.text === "BOSTON CLASS B · B"));
assert.equal(context.counts.selectedAirspaces, 1);
assert.deepEqual(
  resolveThreeOsmAirspaceHitIds([
    { index: 0, object: context.airspaceHitObject || undefined },
    { index: 2, object: context.airspaceHitObject || undefined },
  ]),
  ["bos-class-b"],
);
const camera = new THREE.OrthographicCamera(-400, 400, 300, -300, 0.1, 4_000);
camera.position.set(0, 900, 0.01);
camera.up.set(0, 0, -1);
camera.lookAt(0, 0, 0);
camera.updateMatrixWorld();
const airportTarget = context.contextPickTargets.find(
  (target) => target.kind === "airport" && target.id === "KOWD",
);
assert.ok(airportTarget);
const projectedAirport = airportTarget.position.clone().project(camera);
const airportX = (projectedAirport.x * 0.5 + 0.5) * 800;
const airportY = (-projectedAirport.y * 0.5 + 0.5) * 600;
assert.deepEqual(
  resolveThreeOsmContextScreenHit({
    targets: context.contextPickTargets,
    camera,
    width: 800,
    height: 600,
    x: airportX + 10,
    y: airportY,
  }),
  { kind: "airport", id: "KOWD" },
);
assert.equal(
  resolveThreeOsmContextScreenHit({
    targets: context.contextPickTargets,
    camera,
    width: 800,
    height: 600,
    x: airportX + 20,
    y: airportY,
  }),
  null,
);

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
  selectedAirportIcao: "",
  selectedNavaidKey: "",
  selectedReportingPointKey: "",
  selectedCandidateWatchingSpotId: "",
  userLocation: null,
  tileCenter: lonLatToTileCoordinate(-71.0096, 42.3656, 10),
  centerLat: 42.3656,
  theme: "dark",
  contrastMode: "standard",
  locale: "zh-CN",
});
assert.ok(chineseCounts.labels.some((label) => label.text === "3 导航台"));
assert.equal(
  chineseCounts.contextPickTargets.some((target) => target.kind === "navaid"),
  false,
  "aggregated navaid counts are informational rather than selectable",
);

console.log("threeOsmSceneContext.test.ts ok");
