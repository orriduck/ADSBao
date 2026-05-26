import assert from "node:assert/strict";

import {
  isValidNearbyAirportQuery,
  normalizeNearbyAirportQuery,
} from "./nearbyAirports.utils.js";

{
  const query = normalizeNearbyAirportQuery({
    lat: 49.2,
    lon: -38.5,
    radiusNm: 250,
    limit: 12,
    country: "US",
    minRunwayLength: 5000,
  });

  assert.equal(isValidNearbyAirportQuery(query), true);
}

{
  const query = normalizeNearbyAirportQuery({
    lat: 49.2,
    lon: -38.5,
    radiusNm: 251,
    limit: 12,
    country: "US",
    minRunwayLength: 5000,
  });

  assert.equal(isValidNearbyAirportQuery(query), false);
}

console.log("nearbyAirports.utils.test.js ok");
