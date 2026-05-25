import assert from "node:assert/strict";

import {
  getLostSignalTraceRefreshKey,
  getTrackedAircraftSignalState,
} from "./lostSignalTrackingModel.js";

assert.equal(
  getLostSignalTraceRefreshKey({ lostSignal: false, pollVersion: 12 }),
  "",
);

assert.equal(
  getLostSignalTraceRefreshKey({ lostSignal: true, pollVersion: 12 }),
  "lost-signal:12",
);

assert.equal(
  getLostSignalTraceRefreshKey({ lostSignal: true, pollVersion: 13 }),
  "lost-signal:13",
);

assert.equal(
  getLostSignalTraceRefreshKey({ lostSignal: true, pollVersion: 0 }),
  "",
);

assert.deepEqual(
  getTrackedAircraftSignalState({
    matchesLength: 0,
    previousMisses: 2,
    flightAwareFallback: {
      ok: true,
      hasPosition: false,
      metadata: { status: "enroute" },
    },
  }),
  { misses: 0, lostSignal: false },
);

assert.deepEqual(
  getTrackedAircraftSignalState({
    matchesLength: 0,
    previousMisses: 19,
  }),
  { misses: 20, lostSignal: true },
);

assert.deepEqual(
  getTrackedAircraftSignalState({
    matchesLength: 1,
    previousMisses: 19,
  }),
  { misses: 0, lostSignal: false },
);

console.log("lostSignalTrackingModel.test.js ok");
