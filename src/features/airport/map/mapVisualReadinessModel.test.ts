import assert from "node:assert/strict";

import {
  MAP_DEFERRED_FOCAL_CENTER_CUTOFF_MS,
  MAP_TILE_READY_CUTOFF_MS,
  MAP_VISUAL_CONTENT_READY_CUTOFF_MS,
  hasActiveMapLoadingSource,
  resolveMapVisualGateKey,
  resolveMapVisualReady,
  resolveMapVisualRequirements,
} from "./mapVisualReadinessModel";

assert.equal(MAP_TILE_READY_CUTOFF_MS, 1_500);
assert.equal(MAP_VISUAL_CONTENT_READY_CUTOFF_MS, 1_100);
assert.equal(MAP_DEFERRED_FOCAL_CENTER_CUTOFF_MS, 2_200);

assert.equal(
  resolveMapVisualGateKey({
    variant: "flight",
    callsign: " dal2859 ",
  }),
  "flight|flight:DAL2859",
);

assert.equal(
  resolveMapVisualGateKey({
    variant: "airport",
    icao: " kbos ",
  }),
  "airport|airport:KBOS",
);

assert.equal(
  resolveMapVisualGateKey({
    variant: "airport",
  }),
  "airport|airport:moving",
);

assert.equal(
  hasActiveMapLoadingSource({
    active: false,
    sources: {
      trafficLoading: false,
      weatherLoading: false,
      nearbyAirportsLoading: false,
      routeLoadingCount: 0,
    },
  }),
  false,
);

assert.equal(
  hasActiveMapLoadingSource({
    active: false,
    sources: {
      routeLoadingCount: 2,
    },
  }),
  true,
);

assert.equal(
  hasActiveMapLoadingSource({
    active: true,
  }),
  true,
);

assert.deepEqual(
  resolveMapVisualRequirements({
    feedLoading: true,
    renderedAircraftCount: 24,
    traceExpected: true,
  }),
  {
    aircraftMarkersRequired: false,
    traceRequired: false,
  },
);

assert.deepEqual(
  resolveMapVisualRequirements({
    feedLoading: false,
    renderedAircraftCount: 24,
    traceExpected: true,
  }),
  {
    aircraftMarkersRequired: true,
    traceRequired: true,
  },
);

assert.deepEqual(
  resolveMapVisualRequirements({
    feedLoading: false,
    renderedAircraftCount: 0,
    traceExpected: false,
  }),
  {
    aircraftMarkersRequired: false,
    traceRequired: false,
  },
);

assert.equal(
  resolveMapVisualReady({
    mapCreated: false,
    tilesReady: true,
  }),
  false,
);

assert.equal(
  resolveMapVisualReady({
    mapCreated: true,
    tilesReady: false,
  }),
  false,
);

assert.equal(
  resolveMapVisualReady({
    mapCreated: true,
    tilesReady: true,
    aircraftMarkersRequired: true,
    aircraftMarkersReady: false,
  }),
  false,
);

assert.equal(
  resolveMapVisualReady({
    mapCreated: true,
    tilesReady: true,
    aircraftMarkersRequired: true,
    aircraftMarkersReady: true,
    traceRequired: true,
    traceReady: false,
  }),
  false,
);

assert.equal(
  resolveMapVisualReady({
    mapCreated: true,
    tilesReady: true,
    aircraftMarkersRequired: true,
    aircraftMarkersReady: true,
    traceRequired: true,
    traceReady: true,
  }),
  true,
);
