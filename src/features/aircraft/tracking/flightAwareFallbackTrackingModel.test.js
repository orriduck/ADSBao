import assert from "node:assert/strict";

import {
  getFlightAwareFallbackTraceStartAtMs,
  isFlightAwareFallbackTracking,
  shouldLockMapViewportForTrackingState,
} from "./flightAwareFallbackTrackingModel.js";

const cutoff = Date.parse("2026-05-25T03:00:00.000Z");

assert.equal(
  isFlightAwareFallbackTracking({ status: "flightaware_active" }),
  true,
);
assert.equal(
  isFlightAwareFallbackTracking({ status: "adsb_live" }),
  false,
);
assert.equal(
  isFlightAwareFallbackTracking({ status: "flightaware_terminal" }),
  false,
);

assert.equal(
  getFlightAwareFallbackTraceStartAtMs({
    trackingState: { status: "flightaware_active" },
    defaultTraceStartAtMs: cutoff,
  }),
  null,
);
assert.equal(
  getFlightAwareFallbackTraceStartAtMs({
    trackingState: { status: "adsb_live" },
    defaultTraceStartAtMs: cutoff,
  }),
  cutoff,
);

assert.equal(
  shouldLockMapViewportForTrackingState({ status: "flightaware_active" }),
  true,
);
assert.equal(
  shouldLockMapViewportForTrackingState({ status: "missing" }),
  false,
);

console.log("flightAwareFallbackTrackingModel.test.js ok");
