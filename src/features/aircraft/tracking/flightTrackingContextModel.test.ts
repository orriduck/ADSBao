import assert from "node:assert/strict";

import {
  getFlightTrackingContextPosition,
  hasFiniteFlightPosition,
  resolveFlightFocalLifecycle,
  resolveFlightTerminalReason,
  shouldShowFlightTrackingLoadingOverlay,
} from "./flightTrackingContextModel";

assert.equal(hasFiniteFlightPosition({ lat: 0, lon: 0 }), true);
assert.equal(hasFiniteFlightPosition({ lat: "0", lon: "-0.25" }), true);
assert.equal(hasFiniteFlightPosition({ lat: 91, lon: 0 }), false);
assert.equal(hasFiniteFlightPosition({ lat: 0, lon: 181 }), false);
assert.equal(hasFiniteFlightPosition({ lat: null, lon: 0 }), false);

assert.deepEqual(
  getFlightTrackingContextPosition({ lat: 51.421, lon: -12.456 }),
  {
    lat: 51.4,
    lon: -12.5,
  },
);

assert.deepEqual(
  getFlightTrackingContextPosition({ lat: 0.04, lon: -0.04 }),
  {
    lat: 0,
    lon: 0,
  },
);

// ── shouldShowFlightTrackingLoadingOverlay (loading-state wrapper) ──────────
// Not settled, no focal yet → loading.
assert.equal(
  shouldShowFlightTrackingLoadingOverlay({
    hasActiveFlight: true,
    trackedAircraftSettled: false,
    trackedLoadingOverlayActive: false,
    hasFocalPosition: false,
  }),
  true,
);
// No active flight → never a loading overlay.
assert.equal(
  shouldShowFlightTrackingLoadingOverlay({
    hasActiveFlight: false,
    trackedAircraftSettled: false,
    trackedLoadingOverlayActive: true,
  }),
  false,
);
// Settled with a focal position → not loading (map reveals on the aircraft).
assert.equal(
  shouldShowFlightTrackingLoadingOverlay({
    hasActiveFlight: true,
    trackedAircraftSettled: true,
    hasFocalPosition: true,
  }),
  false,
);
// Settled, no focal, not loading → NOT loading (it's terminal now, not a spinner).
assert.equal(
  shouldShowFlightTrackingLoadingOverlay({
    hasActiveFlight: true,
    trackedAircraftSettled: true,
    trackedLoadingOverlayActive: false,
    hasFocalPosition: false,
  }),
  false,
);

// ── resolveFlightFocalLifecycle (loading / position / terminal) ────────────
const lc = (over: Record<string, unknown>) =>
  resolveFlightFocalLifecycle({ hasActiveFlight: true, ...over });
// A focal position always wins, even before resolve (cached/last-known reveal).
assert.equal(lc({ hasFocalPosition: true, resolved: false }), "position");
// No focal + not resolved → loading.
assert.equal(lc({ hasFocalPosition: false, resolved: false }), "loading");
// No focal + resolved (settled OR grace timed out) → terminal.
assert.equal(lc({ hasFocalPosition: false, resolved: true }), "terminal");
// No active flight → safe loading default.
assert.equal(resolveFlightFocalLifecycle({ hasActiveFlight: false }), "loading");

// ── resolveFlightTerminalReason (copy selection) ───────────────────────────
assert.equal(
  resolveFlightTerminalReason({ trackingStatus: "flightaware_terminal" }),
  "terminal",
);
assert.equal(resolveFlightTerminalReason({ lostSignal: true }), "lost");
assert.equal(resolveFlightTerminalReason({ trackingStatus: "stale" }), "lost");
assert.equal(resolveFlightTerminalReason({ trackingStatus: "missing" }), "missing");
assert.equal(resolveFlightTerminalReason({}), "missing");
