import assert from "node:assert/strict";
import * as THREE from "three";
import {
  collectAirspaceLineCoordinates,
  createThreeOsmContextScene,
  resolveThreeOsmAirspaceHitIds,
  resolveThreeOsmContextScreenHit,
  resolveThreeOsmSpotMapLabel,
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

assert.equal(
  resolveThreeOsmSpotMapLabel("Taxi Holding Area at Cargo Plaza - 13L arrivals"),
  "Taxi Holding Area at Cargo…",
);
assert.equal(
  resolveThreeOsmSpotMapLabel("AVIS Car Rental - 13L arrivals"),
  "AVIS Car Rental",
);
assert.equal(resolveThreeOsmSpotMapLabel("北侧观景台 - 午后顺光"), "北侧观景台");

const context = createThreeOsmContextScene({
  airportCode: "BOS",
  airports: [
    { icao: "KOWD", iata: "OWD", lat: 42.19, lon: -71.17 },
    { icao: "KBAD", iata: "BAD", lat: null, lon: null },
  ],
  surfaceCollection: {
    features: [
      {
        properties: { kind: "apron" },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [-71.02, 42.36],
            [-71.01, 42.36],
            [-71.01, 42.37],
            [-71.02, 42.37],
            [-71.02, 42.36],
          ]],
        },
      },
      {
        properties: { kind: "taxiway" },
        geometry: {
          type: "LineString",
          coordinates: [[-71.02, 42.36], [-71.01, 42.365]],
        },
      },
    ],
  },
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
  runwayApproachVisualization: {
    kind: "approach-lines",
    data: {
      features: [{
        geometry: {
          type: "LineString",
          coordinates: [[-71.02, 42.36], [-71.05, 42.37]],
        },
      }],
    },
  },
  runwayGroundLighting: {
    features: [{
      properties: { role: "edge" },
      geometry: {
        type: "LineString",
        coordinates: [[-71.02, 42.36], [-71.01, 42.37]],
      },
    }],
  },
  runwayEndLabels: [
    {
      key: "04R/22L-04R",
      ident: "04R",
      lat: 42.35404,
      lon: -71.010352,
    },
    { key: "invalid", ident: "", lat: null, lon: null },
  ],
  airspaceFeatures: [
    {
      properties: {
        id: "bos-class-b",
        name: "BOSTON CLASS B",
        classLabel: "B",
        accessLevel: "controlled",
        lowerLimit: { value: 2000, unit: 1, referenceDatum: 1 },
        lowerLimitLabel: "2000 ft MSL",
        upperLimitLabel: "7000 ft MSL",
        verticalLimit: "2000 ft MSL - 7000 ft MSL",
      },
      geometry: { type: "Polygon", coordinates: [ring] },
    },
    {
      properties: {
        id: "bos-class-e5",
        name: "BOSTON CLASS E5",
        classLabel: "E",
        accessLevel: "controlled",
        lowerLimitLabel: "700 ft AGL",
        upperLimitLabel: "FL 60",
      },
      geometry: { type: "Polygon", coordinates: [ring] },
    },
  ],
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
  zoom: 11,
  theme: "dark",
  contrastMode: "standard",
  selectedAirspaceId: "bos-class-b",
  airspaceFocusLimit: 1,
  airspaceLabelLimit: 0,
});
assert.deepEqual(context.counts, {
  airports: 1,
  runways: 1,
  runwayEnds: 1,
  airspaces: 2,
  selectedAirspaces: 1,
  navaids: 1,
  reportingPoints: 1,
  spots: 1,
  userLocation: 1,
});
assert.deepEqual(context.runwayDiagnostics, { segments: 1, vertices: 6 });
assert.equal(context.runwayApproachDiagnostics.kind, "approach-lines");
assert.equal(context.runwayApproachDiagnostics.features, 1);
assert.ok(context.runwayApproachDiagnostics.dashes > 0);
assert.equal(context.groundLightingDiagnostics.visible, false);
assert.deepEqual(context.surfaceDiagnostics, {
  visible: true,
  aprons: 1,
  apronTriangles: 2,
  taxiways: 1,
  taxiwaySegments: 1,
  taxilanes: 0,
  taxilaneSegments: 0,
  vertices: 36,
});
assert.ok(context.labels.some((label) => label.text === "BOS"));
assert.ok(context.labels.some((label) => label.text === "OWD"));
assert.ok(context.labels.some((label) => label.text === "OWD" && label.selected));
assert.ok(
  context.labels.some(
    (label) => label.kind === "runway" && label.text === "04R",
  ),
);
assert.ok(
  context.group.getObjectByName(
    "three-osm-airspace-focus-terminal-controlled",
  ),
);
assert.ok(
  context.group.getObjectByName(
    "three-osm-airspace-context-transition-controlled",
  ),
);
assert.ok(context.group.getObjectByName("three-osm-selected-airspace-boundary"));
assert.ok(context.group.getObjectByName("three-osm-selected-airspace-curtain"));
assert.ok(
  context.group.getObjectByName("three-osm-selected-airspace-upper-boundary"),
);
assert.ok(context.group.getObjectByName("three-osm-selected-airspace-posts"));
assert.ok(context.group.getObjectByName("three-osm-runway-halo"));
assert.ok(context.group.getObjectByName("three-osm-runway-surfaces"));
assert.ok(context.group.getObjectByName("three-osm-runway-approach-lines"));
assert.ok(context.group.getObjectByName("three-osm-apron-fills"));
assert.ok(context.group.getObjectByName("three-osm-taxiway-corridors"));
assert.ok(
  context.labels.some(
    (label) =>
      label.text === "BOSTON CLASS B · B · 2000 ft MSL - 7000 ft MSL",
  ),
);
assert.equal(context.counts.selectedAirspaces, 1);
const {
  buildMs: airspaceBuildMs,
  prepareMs: airspacePrepareMs,
  sceneMs: airspaceSceneMs,
  ...airspaceDiagnostics
} = context.airspaceDiagnostics;
assert.ok(airspaceBuildMs >= 0);
assert.ok(airspacePrepareMs >= 0);
assert.ok(airspaceSceneMs >= 0);
assert.deepEqual(airspaceDiagnostics, {
  features: 2,
  rawSegments: 4,
  segments: 4,
  batches: 2,
  focusFeatures: 1,
  contextFeatures: 1,
  focusSegments: 2,
  contextSegments: 2,
  focusBatches: 1,
  contextBatches: 1,
  contextLabels: 0,
  simplificationTolerance: 0.55,
  featuresByTier: {
    "special-use": 0,
    "terminal-controlled": 1,
    "transition-controlled": 1,
    "upper-controlled": 0,
    advisory: 0,
  },
  featuresByAltitudeBand: { surface: 0, low: 2, high: 0 },
  selectedVolumes: 1,
  selectedVolumeTriangles: 4,
  selectedVolumePosts: 2,
  selectedCueHeightWorld: 14 + Math.log2(11) * 8,
  nearbyVerticalCues: 1,
  nearbyCueSegments: 3,
  nearbyCueBatches: 1,
});
const focusAirspaceHitObject = context.airspaceHitObjects.find(
  (object) => object.name === "three-osm-airspace-focus-terminal-controlled",
);
const contextAirspaceHitObject = context.airspaceHitObjects.find(
  (object) => object.name === "three-osm-airspace-context-transition-controlled",
);
assert.ok(focusAirspaceHitObject);
assert.ok(contextAirspaceHitObject);
assert.deepEqual(
  resolveThreeOsmAirspaceHitIds([
    { index: 0, object: contextAirspaceHitObject },
    { index: 0, object: focusAirspaceHitObject },
  ]),
  ["bos-class-e5", "bos-class-b"],
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
