import assert from "node:assert/strict";

import {
  getActiveAdsbMatchesLength,
  getLostSignalTraceRefreshKey,
  getTrackedFlightTraceRefreshKey,
  getTrackedAircraftSignalState,
  hasActiveFlightAwareFallback,
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

assert.equal(
  getTrackedFlightTraceRefreshKey({
    lostSignal: false,
    pollVersion: 21,
    visibilityRefreshVersion: 2,
  }),
  "visibility:2",
);

assert.equal(
  getTrackedFlightTraceRefreshKey({
    lostSignal: true,
    pollVersion: 21,
    visibilityRefreshVersion: 0,
  }),
  "lost-signal:21",
);

assert.equal(
  getTrackedFlightTraceRefreshKey({
    lostSignal: false,
    pollVersion: 21,
    visibilityRefreshVersion: 0,
  }),
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

assert.equal(
  hasActiveFlightAwareFallback({
    ok: true,
    hasPosition: true,
    position: {
      status: "arrived",
    },
  }),
  false,
);

assert.equal(
  hasActiveFlightAwareFallback({
    ok: true,
    hasPosition: true,
    position: {
      status: "arriving shortly",
    },
  }),
  true,
);

assert.deepEqual(
  getTrackedAircraftSignalState({
    matchesLength: 0,
    previousMisses: 0,
    flightAwareFallback: {
      ok: true,
      hasPosition: true,
      position: {
        status: "arrived",
        terminal: true,
      },
    },
  }),
  { misses: 20, lostSignal: true },
);

assert.equal(
  getActiveAdsbMatchesLength({
    matchesLength: 1,
    source: "flightaware",
  }),
  0,
);

assert.equal(
  getActiveAdsbMatchesLength({
    matchesLength: 1,
    source: "adsb.lol",
  }),
  1,
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

assert.deepEqual(
  getTrackedAircraftSignalState({
    matchesLength: 1,
    previousMisses: 19,
    trackingState: { status: "stale" },
  }),
  { misses: 20, lostSignal: true },
);

assert.deepEqual(
  getTrackedAircraftSignalState({
    matchesLength: 1,
    previousMisses: 19,
    trackingState: { status: "flightaware_active" },
  }),
  { misses: 0, lostSignal: false },
);

assert.deepEqual(
  getTrackedAircraftSignalState({
    matchesLength: 1,
    previousMisses: 0,
    trackingState: { status: "flightaware_terminal" },
  }),
  { misses: 20, lostSignal: true },
);

console.log("lostSignalTrackingModel.test.js ok");
