export const NEARBY_AIRPORT_DEFAULTS = Object.freeze({
  radiusNm: 40,
  limit: 6,
  country: "US",
  minRunwayLength: 5000,
});

export const NEARBY_AIRPORT_LIMITS = Object.freeze({
  minRadiusNm: 1,
  maxRadiusNm: 100,
  minLimit: 1,
  maxLimit: 12,
  minRunwayLength: 0,
  maxRunwayLength: 20_000,
});

export const NEARBY_AIRPORT_INDEX_CACHE_MS = 6 * 60 * 60 * 1000;

export const NEARBY_AIRPORT_CACHE_HEADERS = Object.freeze({
  "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
});
