import assert from "node:assert/strict";

import { AIRCRAFT_TRAFFIC_CONFIG } from "../../../config/aviation.js";
import {
  NEARBY_AIRPORT_DEFAULTS,
  NEARBY_AIRPORT_LIMITS,
  NEARBY_AIRPORT_RADIUS_MULTIPLIER,
} from "./nearbyAirports.models.js";
import {
  isValidNearbyAirportQuery,
  normalizeNearbyAirportQuery,
} from "./nearbyAirports.utils.js";

{
  const query = normalizeNearbyAirportQuery({
    lat: 49.2,
    lon: -38.5,
  });

  assert.equal(query.radiusNm, NEARBY_AIRPORT_DEFAULTS.radiusNm);
  assert.equal(
    query.radiusNm,
    AIRCRAFT_TRAFFIC_CONFIG.rangeNm * NEARBY_AIRPORT_RADIUS_MULTIPLIER,
  );
  assert.equal(query.limit, NEARBY_AIRPORT_LIMITS.maxLimit);
  assert.equal("country" in query, false);
  assert.equal("minRunwayLength" in query, false);
  assert.equal(isValidNearbyAirportQuery(query), true);
}

{
  const query = normalizeNearbyAirportQuery({
    lat: 49.2,
    lon: -38.5,
    radiusNm: 250,
    limit: 12,
  });

  assert.equal(isValidNearbyAirportQuery(query), true);
}

{
  const query = normalizeNearbyAirportQuery({
    lat: 49.2,
    lon: -38.5,
    radiusNm: 251,
    limit: 12,
  });

  assert.equal(isValidNearbyAirportQuery(query), false);
}

console.log("nearbyAirports.utils.test.js ok");
