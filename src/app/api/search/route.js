import { after } from "next/server";

import {
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
} from "@/services/apiProxySecurity.js";
import { createOurAirportsQueriesFromEnv } from "@/services/ourairports/ourAirportsQueries.js";
import { scheduleRefreshIfDue } from "@/services/ourairports/ourAirportsRefresh.js";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

const rateLimit = {
  key: "api:search",
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

export async function GET(request) {
  const securityResponse = enforceProxyRequest(request, { rateLimit });
  if (securityResponse) return securityResponse;

  const url = new URL(request.url);
  const query = String(url.searchParams.get("q") || "").trim();
  const country = String(url.searchParams.get("country") || "")
    .trim()
    .toUpperCase();
  const type = String(url.searchParams.get("type") || "").trim();
  const limitParam = url.searchParams.get("limit");
  const limitRaw = limitParam == null || limitParam === "" ? NaN : Number(limitParam);
  const limit = Number.isFinite(limitRaw)
    ? Math.max(1, Math.min(limitRaw, MAX_LIMIT))
    : DEFAULT_LIMIT;

  if (country && !/^[A-Z]{2}$/.test(country)) {
    return jsonProxyResponse(
      request,
      { error: "country must be a 2-letter ISO code" },
      { status: 400 },
    );
  }

  const queries = createOurAirportsQueriesFromEnv();
  if (!queries) {
    return jsonProxyResponse(
      request,
      { error: "Airport database is not configured" },
      { status: 503 },
    );
  }

  try {
    const airports = await queries.searchAirports({ query, country, type, limit });
    // Trigger a background OurAirports refresh if the cached data is past
    // its TTL. Runs after the response is sent so the user never waits.
    after(() => scheduleRefreshIfDue());
    return jsonProxyResponse(
      request,
      {
        airports,
        source: "ourairports",
        query,
        country,
        type,
        limit,
      },
      { headers: cacheHeaders },
    );
  } catch (error) {
    console.error("[api/search] failed", error);
    return jsonProxyResponse(
      request,
      { error: "Airport search failed" },
      { status: 502 },
    );
  }
}
