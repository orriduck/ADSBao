import assert from "node:assert/strict";

import {
  AIRCRAFT_LOADING_OVERLAY_MIN_VISIBLE_MS,
  areCriticalLoadingRequestsSettled,
  getLoadingOverlayExitDelay,
  resolveAircraftLoadingOverlayMode,
  resolveAircraftLoadingOverlayState,
  resolveMapLoadingPresentation,
  scheduleAfterOverlayPaint,
  shouldShowAircraftLoadingOverlay,
  shouldTriggerVisibilityRefreshOverlay,
} from "./aircraftLoadingOverlayModel";

assert.equal(AIRCRAFT_LOADING_OVERLAY_MIN_VISIBLE_MS, 500);

assert.equal(
  shouldShowAircraftLoadingOverlay({
    initialLoading: true,
    visibilityRefreshLoading: false,
  }),
  true,
);

assert.equal(
  shouldShowAircraftLoadingOverlay({
    initialLoading: false,
    visibilityRefreshLoading: true,
  }),
  true,
);

assert.equal(
  shouldShowAircraftLoadingOverlay({
    initialLoading: false,
    visibilityRefreshLoading: false,
  }),
  false,
);

assert.equal(
  shouldTriggerVisibilityRefreshOverlay({
    wasActive: true,
    hiddenSince: 1_000,
    now: 7_000,
    minHiddenMs: 5_000,
  }),
  true,
);

assert.equal(
  shouldTriggerVisibilityRefreshOverlay({
    wasActive: true,
    hiddenSince: 1_000,
    now: 1_050,
    minHiddenMs: 5_000,
  }),
  false,
);

assert.equal(
  shouldTriggerVisibilityRefreshOverlay({
    wasActive: true,
    hiddenSince: 0,
    now: 7_000,
    minHiddenMs: 5_000,
  }),
  false,
);

assert.equal(
  shouldTriggerVisibilityRefreshOverlay({
    wasActive: false,
    hiddenSince: 1_000,
    now: 1_050,
    minHiddenMs: 5_000,
  }),
  false,
);

assert.equal(
  getLoadingOverlayExitDelay({
    shownAt: 1_000,
    now: 1_120,
    minVisibleMs: AIRCRAFT_LOADING_OVERLAY_MIN_VISIBLE_MS,
  }),
  380,
);

assert.equal(
  getLoadingOverlayExitDelay({
    shownAt: 1_000,
    now: 1_650,
    minVisibleMs: AIRCRAFT_LOADING_OVERLAY_MIN_VISIBLE_MS,
  }),
  0,
);

assert.equal(
  areCriticalLoadingRequestsSettled({
    aircraftPositionsSettled: true,
    metarSettled: true,
    nearbyAirportsSettled: true,
    proceduresSettled: true,
    routeSettled: false,
    aircraftLogoSettled: false,
  }),
  true,
);

assert.equal(
  areCriticalLoadingRequestsSettled({
    aircraftPositionsSettled: true,
    metarSettled: false,
    nearbyAirportsSettled: true,
    proceduresSettled: true,
  }),
  false,
);

assert.equal(
  resolveAircraftLoadingOverlayMode({
    mapReady: false,
    feedLoading: true,
  }),
  "map",
);

assert.equal(
  resolveAircraftLoadingOverlayMode({
    mapReady: true,
    feedLoading: true,
  }),
  "feed",
);

assert.equal(
  resolveAircraftLoadingOverlayMode({
    mapReady: true,
    feedLoading: false,
  }),
  "idle",
);

assert.deepEqual(
  resolveAircraftLoadingOverlayState({
    mapReady: false,
    trafficLoading: true,
    weatherLoading: true,
  }),
  { active: true, mode: "map", reason: "map" },
);

assert.deepEqual(
  resolveAircraftLoadingOverlayState({
    mapReady: true,
    variant: "airport",
    trafficLoading: true,
    weatherLoading: true,
  }),
  { active: true, mode: "feed", reason: "traffic" },
);

assert.deepEqual(
  resolveAircraftLoadingOverlayState({
    mapReady: true,
    variant: "flight",
    trackedAircraftLoading: true,
    nearbyAirportsLoading: true,
  }),
  { active: true, mode: "feed", reason: "trackedAircraft" },
);

assert.deepEqual(
  resolveAircraftLoadingOverlayState({
    mapReady: true,
    variant: "airport",
    weatherLoading: true,
    nearbyAirportsLoading: true,
  }),
  { active: true, mode: "feed", reason: "weather" },
);

assert.deepEqual(
  resolveAircraftLoadingOverlayState({
    mapReady: true,
    proceduresLoading: true,
    routeLoadingCount: 4,
  }),
  { active: true, mode: "feed", reason: "procedures" },
);

assert.deepEqual(
  resolveAircraftLoadingOverlayState({
    mapReady: true,
    routeLoadingCount: 2,
  }),
  { active: true, mode: "feed", reason: "routes" },
);

assert.deepEqual(
  resolveAircraftLoadingOverlayState({
    mapReady: true,
    traceLoading: true,
  }),
  { active: true, mode: "feed", reason: "trace" },
);

assert.deepEqual(
  resolveAircraftLoadingOverlayState({
    mapReady: true,
  }),
  { active: false, mode: "idle", reason: "" },
);

assert.deepEqual(
  resolveMapLoadingPresentation({
    active: true,
    mode: "map",
    reason: "map",
  }),
  { overlayActive: true, sourceStatusActive: false },
);

assert.deepEqual(
  resolveMapLoadingPresentation({
    active: true,
    mode: "feed",
    reason: "routes",
  }),
  { overlayActive: false, sourceStatusActive: true },
);

assert.deepEqual(
  resolveMapLoadingPresentation({
    active: false,
    mode: "idle",
    reason: "",
  }),
  { overlayActive: false, sourceStatusActive: false },
);

{
  const frameCallbacks = [];
  const cancelledFrames = [];
  let calls = 0;
  let frameId = 0;

  const cancel = scheduleAfterOverlayPaint(
    () => {
      calls += 1;
    },
    {
      requestAnimationFrame(callback) {
        frameCallbacks.push(callback);
        frameId += 1;
        return frameId;
      },
      cancelAnimationFrame(id) {
        cancelledFrames.push(id);
      },
    },
  );

  assert.equal(calls, 0);
  assert.equal(frameCallbacks.length, 1);

  frameCallbacks.shift()();
  assert.equal(calls, 0);
  assert.equal(frameCallbacks.length, 1);

  frameCallbacks.shift()();
  assert.equal(calls, 1);

  cancel();
  assert.deepEqual(cancelledFrames, [1, 2]);
}
