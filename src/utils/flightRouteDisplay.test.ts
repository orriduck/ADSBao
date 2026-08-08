import assert from "node:assert/strict";

import { formatRoutePlaceLabel } from "./flightRouteDisplay";

assert.equal(
  formatRoutePlaceLabel({ city: "Paris (Roissy)", countryCode: "FR" }),
  "🇫🇷 Paris",
);
assert.equal(
  formatRoutePlaceLabel({ city: "Mexico City", countryCode: "MX" }),
  "🇲🇽 Mexico City",
);
assert.equal(
  formatRoutePlaceLabel({ city: "Tokyo (Haneda) (HND)", countryCode: "JP" }),
  "🇯🇵 Tokyo",
);

console.log("flightRouteDisplay.test.ts ok");
