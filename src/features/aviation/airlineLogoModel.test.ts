import assert from "node:assert/strict";

import {
  clearAirlineLogoCacheForTest,
  getFlightRouteAirlineIconUrl,
  isAirlineLogoUnavailable,
  markAirlineLogoUnavailable,
} from "./airlineLogoModel";

clearAirlineLogoCacheForTest();

assert.equal(
  getFlightRouteAirlineIconUrl({
    airlineIcao: " dal ",
  }),
  "/api/proxy/airlines/DAL",
);

assert.equal(
  getFlightRouteAirlineIconUrl({
    airline: { icao: "BAW" },
  }),
  "/api/proxy/airlines/BAW",
);

assert.equal(getFlightRouteAirlineIconUrl({ airlineIcao: "N12" }), "");
assert.equal(getFlightRouteAirlineIconUrl({ airlineIcao: "TOOLONG" }), "");

markAirlineLogoUnavailable("/api/proxy/airlines/DAL");
assert.equal(isAirlineLogoUnavailable("/api/proxy/airlines/DAL"), true);
assert.equal(
  getFlightRouteAirlineIconUrl({
    airlineIcao: "DAL",
  }),
  "",
);

clearAirlineLogoCacheForTest();
assert.equal(isAirlineLogoUnavailable("/api/proxy/airlines/DAL"), false);
assert.equal(
  getFlightRouteAirlineIconUrl({
    airlineIcao: "DAL",
  }),
  "/api/proxy/airlines/DAL",
);
