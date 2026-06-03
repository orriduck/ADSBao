import { AIRCRAFT_TRAFFIC_CONFIG } from "../../../config/aviation";

const NEARBY_AIRPORT_RADIUS_MULTIPLIER = 1.5;

export const NEARBY_AIRPORT_LIMITS = Object.freeze({
  minRadiusNm: 1,
  maxRadiusNm: 250,
  minLimit: 1,
  maxLimit: 100,
});

export const NEARBY_AIRPORT_DEFAULTS = Object.freeze({
  radiusNm: AIRCRAFT_TRAFFIC_CONFIG.rangeNm * NEARBY_AIRPORT_RADIUS_MULTIPLIER,
  limit: NEARBY_AIRPORT_LIMITS.maxLimit,
});

export const NEARBY_AIRPORT_CACHE_HEADERS = Object.freeze({
  "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
});
