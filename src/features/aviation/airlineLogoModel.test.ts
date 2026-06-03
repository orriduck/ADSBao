import assert from "node:assert/strict";

import {
  getFlightRouteAirlineIconUrl,
  isAirlineLogoUnavailable,
  markAirlineLogoUnavailable,
} from "./airlineLogoModel";

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

assert.equal(isAirlineLogoUnavailable("/api/proxy/airlines/BAW"), false);
assert.equal(
  getFlightRouteAirlineIconUrl({
    airlineIcao: "BAW",
  }),
  "/api/proxy/airlines/BAW",
);
