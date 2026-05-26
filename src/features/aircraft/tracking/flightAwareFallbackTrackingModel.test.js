import assert from "node:assert/strict";

import {
  getFlightAwareFallbackAutoFitKey,
  getFlightAwareFallbackTraceStartAtMs,
  isFlightAwareFallbackTracking,
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
  getFlightAwareFallbackAutoFitKey({
    trackingState: { status: "flightaware_active" },
    callsign: "ual23",
    aircraftHex: "A1F1A0",
  }),
  "flightaware:UAL23:A1F1A0",
);
assert.equal(
  getFlightAwareFallbackAutoFitKey({
    trackingState: { status: "flightaware_active" },
    callsign: "ual23",
  }),
  "flightaware:UAL23",
);
assert.equal(
  getFlightAwareFallbackAutoFitKey({
    trackingState: { status: "adsb_live" },
    callsign: "ual23",
    aircraftHex: "A1F1A0",
  }),
  "",
);

console.log("flightAwareFallbackTrackingModel.test.js ok");
