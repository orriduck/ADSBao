import assert from "node:assert/strict";

import {
  ROUTE_PROVIDER,
  buildMapSourceStatusDisplay,
  getAircraftPositionSourceBadge,
  resolveFlightPositionSource,
} from "./sourceDisplayModel";

assert.equal(
  getAircraftPositionSourceBadge({ source: "adsb_lol", kind: "observed" }),
  "ads-b",
);
assert.equal(
  getAircraftPositionSourceBadge({ source: "airplanes_live", kind: "observed" }),
  "ads-b",
);
assert.equal(
  getAircraftPositionSourceBadge({ source: "adsb_fi", kind: "observed" }),
  "ads-b",
);
assert.equal(
  getAircraftPositionSourceBadge({
    source: "airplanes_live",
    flight_position_source: "adsc",
    kind: "oceanic",
  }),
  "ADS-C · oceanic",
);
assert.equal(
  getAircraftPositionSourceBadge({ source: "flightaware", kind: "estimated" }),
  "flightaware",
);
assert.equal(
  getAircraftPositionSourceBadge({
    flight_position_source: "flightaware",
    isEstimated: true,
  }),
  "flightaware",
);
assert.equal(
  getAircraftPositionSourceBadge({ flight_position_source: "mlat" }),
  "MLAT",
);
assert.equal(
  getAircraftPositionSourceBadge({ flight_position_source: "estimated" }),
  "Estimated",
);
assert.equal(
  getAircraftPositionSourceBadge({ source: "unknown", kind: "stale" }),
  "Stale",
);

assert.equal(resolveFlightPositionSource({ flight_position_source: "MLAT" }), "mlat");
assert.equal(resolveFlightPositionSource({ flight_position_source: "ADSC" }), "adsc");
assert.equal(
  resolveFlightPositionSource({ source: "flightaware", kind: "predicted" }),
  "flightaware",
);
assert.equal(resolveFlightPositionSource({ isEstimated: true }), "estimated");
assert.equal(resolveFlightPositionSource({ source: "adsb.lol" }), "adsb");

assert.deepEqual(
  buildMapSourceStatusDisplay({
    feedSource: "airplanes.live",
    routeProvider: ROUTE_PROVIDER.FLIGHTAWARE,
  }),
  {
    feedSource: "ads-b",
  },
);

assert.deepEqual(
  buildMapSourceStatusDisplay({
    feedSource: "custom-feed",
    routeProvider: ROUTE_PROVIDER.ADSBDB,
  }),
  {
    feedSource: "custom-feed",
  },
);

assert.deepEqual(
  buildMapSourceStatusDisplay({
    feedSource: "",
    routeProvider: "",
  }),
  {
    feedSource: "",
  },
);

console.log("sourceDisplayModel.test.ts ok");
