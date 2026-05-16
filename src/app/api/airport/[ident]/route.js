import { after } from "next/server";

import {
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
} from "@/app/api/_shared/apiProxySecurity.js";
import {
  getAirportDirectoryPage,
  refreshAirportDirectoryIfDue,
} from "@/features/airport-directory/airportDirectory.mechanism.js";
import {
  AIRPORT_DIRECTORY_CACHE_HEADERS,
  AirportDirectoryConfigurationError,
} from "@/features/airport-directory/airportDirectory.models.js";
import {
  isValidAirportIdent,
  normalizeAirportDetailOptions,
  normalizeAirportIdent,
} from "@/features/airport-directory/airportDirectory.utils.js";

const rateLimit = {
  key: "api:airport-detail",
  maxRequests: 60,
  windowMs: 60_000,
};

export const runtime = "nodejs";

export function OPTIONS(request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request, { params }) {
  const securityResponse = enforceProxyRequest(request, { rateLimit });
  if (securityResponse) return securityResponse;

  const resolvedParams = await params;
  const ident = normalizeAirportIdent(resolvedParams?.ident);
  if (!isValidAirportIdent(ident)) {
    return jsonProxyResponse(
      request,
      { error: "Invalid airport ident" },
      { status: 400 },
    );
  }

  const url = new URL(request.url);
  const { radiusNm, nearbyLimit } = normalizeAirportDetailOptions({
    nearbyRadiusNm: url.searchParams.get("nearbyRadiusNm"),
    nearbyLimit: url.searchParams.get("nearbyLimit"),
  });

  try {
    const data = await getAirportDirectoryPage({ ident, radiusNm, nearbyLimit });
    after(() => refreshAirportDirectoryIfDue());
    if (!data) {
      return jsonProxyResponse(
        request,
        { error: "Airport not found" },
        { status: 404 },
      );
    }
    return jsonProxyResponse(request, data, {
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
    console.error("[api/airport] failed", error);
    return jsonProxyResponse(
      request,
      { error: "Airport detail load failed" },
      { status: 502 },
    );
  }
}
