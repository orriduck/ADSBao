import assert from "node:assert/strict";

import { AIRCRAFT_TRAFFIC_CONFIG } from "../../../config/aviation";
import {
  NEARBY_AIRPORT_DEFAULTS,
  NEARBY_AIRPORT_LIMITS,
} from "./nearbyAirports.models";
import {
  isValidNearbyAirportQuery,
  normalizeNearbyAirportQuery,
} from "./nearbyAirports.utils";

{
  const query = normalizeNearbyAirportQuery({
    lat: 49.2,
    lon: -38.5,
  });

  assert.equal(query.radiusNm, NEARBY_AIRPORT_DEFAULTS.radiusNm);
  assert.equal(
    query.radiusNm,
    AIRCRAFT_TRAFFIC_CONFIG.rangeNm * 1.5,
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

console.log("nearbyAirports.utils.test.ts ok");
