import { after } from "next/server";

import {
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
} from "@/app/api/_shared/apiProxySecurity.js";
import {
  refreshAirportDirectoryIfDue,
  searchAirportDirectory,
} from "@/features/airport-directory/airportDirectory.mechanism.js";
import {
  AIRPORT_DIRECTORY_CACHE_HEADERS,
  AirportDirectoryConfigurationError,
} from "@/features/airport-directory/airportDirectory.models.js";
import {
  isValidAirportSearchCountry,
  normalizeAirportSearchCountry,
  normalizeAirportSearchLimit,
  normalizeAirportSearchQuery,
  normalizeAirportSearchType,
} from "@/features/airport-directory/airportDirectory.utils.js";

const rateLimit = {
  key: "api:search",
  maxRequests: 60,
  windowMs: 60_000,
};

export const runtime = "nodejs";

export function OPTIONS(request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request) {
  const securityResponse = enforceProxyRequest(request, { rateLimit });
  if (securityResponse) return securityResponse;

  const url = new URL(request.url);
  const query = normalizeAirportSearchQuery(url.searchParams.get("q"));
  const country = normalizeAirportSearchCountry(url.searchParams.get("country"));
  const type = normalizeAirportSearchType(url.searchParams.get("type"));
  const limit = normalizeAirportSearchLimit(url.searchParams.get("limit"));

  if (!isValidAirportSearchCountry(country)) {
    return jsonProxyResponse(
      request,
      { error: "country must be a 2-letter ISO code" },
      { status: 400 },
    );
  }

  try {
    const payload = await searchAirportDirectory({ query, country, type, limit });
    after(() => refreshAirportDirectoryIfDue());
    return jsonProxyResponse(request, payload, {
      headers: AIRPORT_DIRECTORY_CACHE_HEADERS,
    });
  } catch (error) {
    if (error instanceof AirportDirectoryConfigurationError) {
      return jsonProxyResponse(
        request,
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("[api/search] failed", error);
    return jsonProxyResponse(
      request,
      { error: "Airport search failed" },
      { status: 502 },
    );
  }
}
