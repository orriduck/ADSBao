import assert from "node:assert/strict";

import {
  DATA_SOURCE,
  ROUTE_PROVIDER,
  buildMobileMapSourceStatus,
  getDataSourceDisplayName,
  getAircraftPositionSourceBadge,
  getRouteProviderDisplayName,
} from "./sourceDisplayModel.js";

assert.equal(getDataSourceDisplayName(DATA_SOURCE.ADSB_LOL), "adsb.lol");
assert.equal(
  getDataSourceDisplayName(DATA_SOURCE.AIRPLANES_LIVE),
  "airplanes.live",
);
assert.equal(getDataSourceDisplayName("custom-feed"), "custom-feed");
assert.equal(getDataSourceDisplayName(""), "");

assert.equal(
  getRouteProviderDisplayName(ROUTE_PROVIDER.FLIGHTAWARE),
  "FlightAware",
);
assert.equal(getRouteProviderDisplayName(ROUTE_PROVIDER.ADSBDB), "adsbdb");
assert.equal(getRouteProviderDisplayName(""), "");

assert.equal(
  getAircraftPositionSourceBadge({ source: "adsb_lol", kind: "observed" }),
  "ADS-B",
);
assert.equal(
  getAircraftPositionSourceBadge({ source: "airplanes_live", kind: "observed" }),
  "Airplanes.live",
);
assert.equal(
  getAircraftPositionSourceBadge({ source: "flightaware", kind: "estimated" }),
  "FlightAware · estimated",
);
assert.equal(
  getAircraftPositionSourceBadge({ source: "unknown", kind: "stale" }),
  "Stale",
);

assert.deepEqual(
  buildMobileMapSourceStatus({
    feedSource: DATA_SOURCE.AIRPLANES_LIVE,
    routeProvider: ROUTE_PROVIDER.FLIGHTAWARE,
  }),
  {
    feedSource: "AIRPLANES.LIVE",
    routeProvider: "FLIGHTAWARE",
  },
);

assert.deepEqual(
  buildMobileMapSourceStatus({
    feedSource: "",
    routeProvider: ROUTE_PROVIDER.ADSBDB,
  }),
  {
    feedSource: "",
    routeProvider: "ADSBDB",
  },
);

console.log("sourceDisplayModel.test.js ok");
