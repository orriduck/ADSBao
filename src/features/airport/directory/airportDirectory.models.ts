export const AIRPORT_DIRECTORY_SOURCE = "openaip";

export const AIRPORT_SEARCH_LIMITS = Object.freeze({
  defaultLimit: 12,
  maxLimit: 50,
});

export const AIRPORT_DETAIL_LIMITS = Object.freeze({
  maxNearbyRadiusNm: 250,
  maxNearbyLimit: 50,
});

export const AIRPORT_DIRECTORY_CACHE_HEADERS = Object.freeze({
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
});

export class AirportDirectoryConfigurationError extends Error {
  status: number;

  constructor(message = "OpenAIP airport data is not configured") {
    super(message);
    this.name = "AirportDirectoryConfigurationError";
    this.status = 503;
  }
}
