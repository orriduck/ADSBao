import {
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
} from "@/services/apiProxySecurity.js";
import { createAirportPageDataServiceFromEnv } from "@/services/airports/airportPageDataService.js";

const rateLimit = {
  key: "api:airport-detail",
  maxRequests: 60,
  windowMs: 60_000,
};

const cacheHeaders = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
};

export const runtime = "nodejs";

export function OPTIONS(request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request, { params }) {
  const securityResponse = enforceProxyRequest(request, { rateLimit });
  if (securityResponse) return securityResponse;

  const resolvedParams = await params;
  const ident = String(resolvedParams?.ident || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{2,7}$/.test(ident)) {
    return jsonProxyResponse(
      request,
      { error: "Invalid airport ident" },
      { status: 400 },
    );
  }

  const url = new URL(request.url);
  const radiusRaw = Number(url.searchParams.get("nearbyRadiusNm"));
  const radiusNm = Number.isFinite(radiusRaw)
    ? Math.max(1, Math.min(radiusRaw, 250))
    : undefined;
  const limitRaw = Number(url.searchParams.get("nearbyLimit"));
  const nearbyLimit = Number.isFinite(limitRaw)
    ? Math.max(1, Math.min(limitRaw, 50))
    : undefined;

  const service = createAirportPageDataServiceFromEnv();
  if (!service) {
    return jsonProxyResponse(
      request,
      { error: "Airport database is not configured" },
      { status: 503 },
    );
  }

  try {
    const data = await service.getAirportPageData(ident, { radiusNm, nearbyLimit });
    if (!data.airport) {
      return jsonProxyResponse(
        request,
        { error: "Airport not found" },
        { status: 404 },
      );
    }
    return jsonProxyResponse(
      request,
      { ...data, source: "ourairports" },
      { headers: cacheHeaders },
    );
  } catch (error) {
    console.error("[api/airport] failed", error);
    return jsonProxyResponse(
      request,
      { error: "Airport detail load failed" },
      { status: 502 },
    );
  }
}
