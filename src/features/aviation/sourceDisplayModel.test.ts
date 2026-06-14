import assert from "node:assert/strict";

import {
  ROUTE_PROVIDER,
  buildMapSourceStatusDisplay,
  getAircraftPositionSourceBadge,
  getMapPositionSourceBadge,
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
assert.equal(
  getAircraftPositionSourceBadge({
    source: "airplanes_live",
    flight_position_source: "estimated",
    kind: "stale",
    isStale: true,
  }),
  "Stale",
);
assert.equal(
  getMapPositionSourceBadge({
    positionQuality: { source: "airplanes_live", kind: "observed" },
    lastUpdated: new Date("2026-06-14T04:00:00.000Z"),
    now: Date.parse("2026-06-14T04:02:00.000Z"),
  }),
  "Stale",
);
assert.equal(
  getMapPositionSourceBadge({
    positionQuality: { source: "airplanes_live", kind: "observed" },
    trackingState: { status: "stale" },
    lastUpdated: new Date("2026-06-14T04:01:50.000Z"),
    now: Date.parse("2026-06-14T04:02:00.000Z"),
  }),
  "Stale",
);
assert.equal(
  getMapPositionSourceBadge({
    positionQuality: { source: "airplanes_live", kind: "observed" },
    lastUpdated: new Date("2026-06-14T04:01:50.000Z"),
    now: Date.parse("2026-06-14T04:02:00.000Z"),
  }),
  "ads-b",
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
