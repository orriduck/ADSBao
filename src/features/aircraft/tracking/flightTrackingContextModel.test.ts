import assert from "node:assert/strict";

import {
  getFlightTrackingContextPosition,
  hasFiniteFlightPosition,
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

assert.equal(
  shouldShowFlightTrackingLoadingOverlay({
    hasActiveFlight: true,
    trackedAircraftSettled: false,
    trackedLoadingOverlayActive: false,
  }),
  true,
);

assert.equal(
  shouldShowFlightTrackingLoadingOverlay({
    hasActiveFlight: true,
    trackedAircraftSettled: true,
    trackedLoadingOverlayActive: true,
  }),
  true,
);

assert.equal(
  shouldShowFlightTrackingLoadingOverlay({
    hasActiveFlight: true,
    trackedAircraftSettled: true,
    trackedLoadingOverlayActive: false,
    nearbyAircraftSettled: false,
    nearbyAirportsSettled: false,
    nearbyLoadingOverlayActive: true,
  }),
  false,
);

assert.equal(
  shouldShowFlightTrackingLoadingOverlay({
    hasActiveFlight: false,
    trackedAircraftSettled: false,
    trackedLoadingOverlayActive: true,
  }),
  false,
);

// Settled with a focal position → overlay lifts (map reveals on the aircraft).
assert.equal(
  shouldShowFlightTrackingLoadingOverlay({
    hasActiveFlight: true,
    trackedAircraftSettled: true,
    trackedLoadingOverlayActive: false,
    hasFocalPosition: true,
  }),
  false,
);

// Settled but no focal position yet → overlay stays up so the fallback-centered
// map never flashes (e.g. right after navigating between tracked flights).
assert.equal(
  shouldShowFlightTrackingLoadingOverlay({
    hasActiveFlight: true,
    trackedAircraftSettled: true,
    trackedLoadingOverlayActive: false,
    hasFocalPosition: false,
  }),
  true,
);
