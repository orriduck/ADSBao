import assert from "node:assert/strict";

import {
  getFlightAwareFallbackAutoFitKey,
  isFlightAwareFallbackTracking,
} from "./flightAwareFallbackTrackingModel";

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

console.log("flightAwareFallbackTrackingModel.test.ts ok");
