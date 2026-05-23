import assert from "node:assert/strict";

import {
  DATA_SOURCE,
  ROUTE_PROVIDER,
  buildMobileMapSourceStatus,
  getDataSourceDisplayName,
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
