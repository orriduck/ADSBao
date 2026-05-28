import assert from "node:assert/strict";

import {
  resolveAircraftVisibilityPolling,
} from "./aircraftVisibilityPollingModel.js";

assert.deepEqual(
  resolveAircraftVisibilityPolling({
    documentHidden: true,
    hasActiveQuery: true,
    pollWhenHidden: false,
  }),
  {
    shouldStopPolling: true,
    shouldRefreshNow: false,
    shouldShowRefreshOverlay: false,
  },
);

assert.deepEqual(
  resolveAircraftVisibilityPolling({
    documentHidden: true,
    hasActiveQuery: true,
    pollWhenHidden: true,
    hiddenSince: 1_000,
    now: 4_000,
  }),
  {
    shouldStopPolling: false,
    shouldRefreshNow: false,
    shouldShowRefreshOverlay: false,
  },
);

assert.deepEqual(
  resolveAircraftVisibilityPolling({
    documentHidden: true,
    hasActiveQuery: true,
    pollWhenHidden: true,
    hiddenSince: 1_000,
    now: 32_000,
    maxHiddenPollMs: 30_000,
  }),
  {
    shouldStopPolling: true,
    shouldRefreshNow: false,
    shouldShowRefreshOverlay: false,
  },
);

assert.deepEqual(
  resolveAircraftVisibilityPolling({
    documentHidden: false,
    hasActiveQuery: true,
    wasActive: true,
    hiddenSince: 1_000,
    now: 8_000,
    minHiddenMs: 5_000,
  }),
  {
    shouldStopPolling: false,
    shouldRefreshNow: true,
    shouldShowRefreshOverlay: true,
  },
);

assert.deepEqual(
  resolveAircraftVisibilityPolling({
    documentHidden: false,
    hasActiveQuery: false,
    wasActive: false,
    hiddenSince: 1_000,
    now: 8_000,
    minHiddenMs: 5_000,
  }),
  {
    shouldStopPolling: false,
    shouldRefreshNow: false,
    shouldShowRefreshOverlay: false,
  },
);

console.log("aircraftVisibilityPollingModel.test.js ok");
