import assert from "node:assert/strict";

import {
  AIRCRAFT_LOADING_OVERLAY_MIN_VISIBLE_MS,
  areCriticalLoadingRequestsSettled,
  getLoadingOverlayExitDelay,
  scheduleAfterOverlayPaint,
  shouldShowAircraftLoadingOverlay,
  shouldTriggerVisibilityRefreshOverlay,
} from "./aircraftLoadingOverlayModel.js";

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
