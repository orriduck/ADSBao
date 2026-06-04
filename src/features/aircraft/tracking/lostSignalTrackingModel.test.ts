import assert from "node:assert/strict";

import {
  getActiveAdsbMatchesLength,
  getTrackedFlightTraceRefreshKey,
  getTrackedAircraftSignalState,
  hasActiveFlightAwareFallback,
  shouldRetainActiveTrackingState,
} from "./lostSignalTrackingModel";

assert.equal(
  getTrackedFlightTraceRefreshKey({ lostSignal: false, pollVersion: 12 }),
  "",
);

assert.equal(
  getTrackedFlightTraceRefreshKey({ lostSignal: true, pollVersion: 12 }),
  "lost-signal:12",
);

assert.equal(
  getTrackedFlightTraceRefreshKey({ lostSignal: true, pollVersion: 13 }),
  "lost-signal:13",
);

assert.equal(
  getTrackedFlightTraceRefreshKey({ lostSignal: true, pollVersion: 0 }),
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
    trackingState: { status: "flightaware_active" },
    pollMs: 3_000,
    flightAwareTraceRefreshMs: 60_000,
  }),
  "flightaware:1",
);

assert.equal(
  getTrackedFlightTraceRefreshKey({
    lostSignal: false,
    pollVersion: 39,
    visibilityRefreshVersion: 0,
    trackingState: { status: "flightaware_active" },
    pollMs: 3_000,
    flightAwareTraceRefreshMs: 60_000,
  }),
  "flightaware:1",
);

assert.equal(
  getTrackedFlightTraceRefreshKey({
    lostSignal: false,
    pollVersion: 40,
    visibilityRefreshVersion: 0,
    trackingState: { status: "flightaware_active" },
    pollMs: 3_000,
    flightAwareTraceRefreshMs: 60_000,
  }),
  "flightaware:2",
);

assert.equal(
  getTrackedFlightTraceRefreshKey({
    lostSignal: false,
    pollVersion: 19,
    visibilityRefreshVersion: 0,
    trackingState: { status: "flightaware_active" },
    pollMs: 3_000,
    flightAwareTraceRefreshMs: 60_000,
  }),
  "",
);

assert.equal(
  getTrackedFlightTraceRefreshKey({
    lostSignal: false,
    pollVersion: 21,
    visibilityRefreshVersion: 0,
    trackingState: { status: "adsb_live" },
    pollMs: 3_000,
    flightAwareTraceRefreshMs: 60_000,
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
    previousMisses: 19,
    trackingState: { status: "oceanic_adsc" },
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

assert.equal(
  shouldRetainActiveTrackingState({
    previousTrackingState: { status: "oceanic_adsc" },
    nextTrackingState: { status: "missing" },
    matchesLength: 0,
    lostSignal: false,
  }),
  true,
);

assert.equal(
  shouldRetainActiveTrackingState({
    previousTrackingState: { status: "flightaware_active" },
    nextTrackingState: { status: "stale" },
    matchesLength: 0,
    lostSignal: false,
  }),
  true,
);

assert.equal(
  shouldRetainActiveTrackingState({
    previousTrackingState: { status: "oceanic_adsc" },
    nextTrackingState: { status: "missing" },
    matchesLength: 0,
    lostSignal: true,
  }),
  false,
);

assert.equal(
  shouldRetainActiveTrackingState({
    previousTrackingState: { status: "oceanic_adsc" },
    nextTrackingState: { status: "missing" },
    matchesLength: 1,
    lostSignal: false,
  }),
  false,
);

console.log("lostSignalTrackingModel.test.ts ok");
