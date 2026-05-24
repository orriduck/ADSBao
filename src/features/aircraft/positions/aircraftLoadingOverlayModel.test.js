import assert from "node:assert/strict";

import {
  AIRCRAFT_LOADING_OVERLAY_MIN_VISIBLE_MS,
  areCriticalLoadingRequestsSettled,
  getLoadingOverlayExitDelay,
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
    hiddenSince: 0,
    now: 1_050,
  }),
  true,
);

assert.equal(
  shouldTriggerVisibilityRefreshOverlay({
    wasActive: false,
    hiddenSince: 1_000,
    now: 1_050,
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
