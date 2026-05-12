import {
  buildProxyHeaders,
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
  readResponseJson,
} from "@/services/apiProxySecurity.js";
import { withAuditLogging } from "@/utils/apiLogger.js";
import {
  buildVrsRouteResponse,
  buildVrsRouteUrl,
  normalizeRouteCallsign,
  shouldUseAerodataboxFallback,
  VRS_ROUTE_MISS_STATUS,
  VRS_ROUTE_USER_AGENT,
} from "@/services/aviation/vrsRouteProxyModel.js";
import {
  AERODATABOX_RAPIDAPI_HOST,
  buildAerodataboxFlightRouteResponse,
  buildAerodataboxFlightUrl,
  reserveAerodataboxRequestSlot,
  resolveAerodataboxDateLocal,
  shouldSuppressVrsRouteAfterAerodataboxStatus,
} from "@/services/aviation/aerodataboxRouteProxyModel.js";

const aerodataboxRapidApiKey = process.env.AERODATABOX_RAPIDAPI_KEY || "";
const aerodataboxRapidApiHost =
  process.env.AERODATABOX_RAPIDAPI_HOST || AERODATABOX_RAPIDAPI_HOST;
let nextAerodataboxRequestAt = 0;

const ROUTE_CACHE_TTL_SECONDS = 60 * 60;
const ROUTE_MISS_CACHE_TTL_SECONDS = 5 * 60;
const ROUTE_STALE_WHILE_REVALIDATE_SECONDS = 10 * 60;

function buildRouteCacheHeaders(body) {
  const ttl = body ? ROUTE_CACHE_TTL_SECONDS : ROUTE_MISS_CACHE_TTL_SECONDS;
  const cdnValue = `public, s-maxage=${ttl}, stale-while-revalidate=${ROUTE_STALE_WHILE_REVALIDATE_SECONDS}`;
  return {
    "Cache-Control": "public, max-age=0, must-revalidate",
    "CDN-Cache-Control": cdnValue,
    "Vercel-CDN-Cache-Control": cdnValue,
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForAerodataboxSlot() {
  const slot = reserveAerodataboxRequestSlot({
    now: Date.now(),
    nextAllowedAt: nextAerodataboxRequestAt,
  });
  nextAerodataboxRequestAt = slot.nextAllowedAt;
  if (slot.delayMs > 0) await sleep(slot.delayMs);
}

async function fetchVrsStandingRoute(callsign) {
  let response;
  try {
    response = await fetch(buildVrsRouteUrl(callsign), {
      headers: {
        "User-Agent": VRS_ROUTE_USER_AGENT,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(9_000),
    });
  } catch (err) {
    console.warn(`[vrs-route] fetch failed for ${callsign}:`, err.message);
    return null;
  }

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    console.warn(`[vrs-route] HTTP ${response.status} for ${callsign}`);
    return null;
  }

  const payload = await readResponseJson(response, {
    label: "VRS standing-data route",
    maxBytes: 512 * 1024,
  });
  return buildVrsRouteResponse(callsign, payload);
}

async function fetchAerodataboxRoute(callsign, targetAirport) {
  if (!aerodataboxRapidApiKey) {
    return { route: null, suppressVrsRoute: false };
  }

  const url = buildAerodataboxFlightUrl(callsign, resolveAerodataboxDateLocal());
  const auditedFetch = withAuditLogging(
    (requestUrl, options) => fetch(requestUrl, options),
    { service: "aerodatabox/FlightStatus" },
  );
  let response;
  try {
    await waitForAerodataboxSlot();
    response = await auditedFetch(url, {
      headers: {
        Accept: "application/json",
        "X-RapidAPI-Key": aerodataboxRapidApiKey,
        "X-RapidAPI-Host": aerodataboxRapidApiHost,
      },
      signal: AbortSignal.timeout(9_000),
    });
  } catch (err) {
    console.warn(`[aerodatabox-route] fetch failed for ${callsign}:`, err.message);
    return { route: null, suppressVrsRoute: false };
  }

  if (response.status === 204 || response.status === 404) {
    return { route: null, suppressVrsRoute: false };
  }

  if (!response.ok) {
    console.warn(`[aerodatabox-route] HTTP ${response.status} for ${callsign}`);
    return {
      route: null,
      suppressVrsRoute: shouldSuppressVrsRouteAfterAerodataboxStatus(
        response.status,
      ),
    };
  }

  const payload = await readResponseJson(response, {
    label: "AeroDataBox flight status route",
    maxBytes: 512 * 1024,
  });
  return {
    route: buildAerodataboxFlightRouteResponse(
      callsign,
      payload,
      targetAirport,
    ),
    suppressVrsRoute: false,
  };
}

function getTargetAirport(request) {
  const params = request.nextUrl?.searchParams;
  return {
    icao: params?.get("airportIcao") || params?.get("airport") || "",
    iata: params?.get("airportIata") || "",
  };
}

const rateLimit = {
  key: "proxy:flight-routes",
  maxRequests: 360,
  windowMs: 60_000,
};

export function OPTIONS(request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request, { params }) {
  const securityResponse = enforceProxyRequest(request, { rateLimit });
  if (securityResponse) return securityResponse;

  const { callsign: rawCallsign = "" } = await params;
  const callsign = normalizeRouteCallsign(rawCallsign);

  if (!callsign) {
    return jsonProxyResponse(
      request,
      { error: "Invalid callsign" },
      { status: 400 },
    );
  }

  try {
    const targetAirport = getTargetAirport(request);
    let body = await fetchVrsStandingRoute(callsign);
    if (shouldUseAerodataboxFallback(body, targetAirport)) {
      const aerodataboxResult = await fetchAerodataboxRoute(
        callsign,
        targetAirport,
      );
      if (aerodataboxResult.route) {
        body = aerodataboxResult.route;
      } else if (aerodataboxResult.suppressVrsRoute) {
        body = null;
      }
    }

    return Response.json(body, {
      status: body ? 200 : VRS_ROUTE_MISS_STATUS,
      headers: buildProxyHeaders(request, buildRouteCacheHeaders(body)),
    });
  } catch (err) {
    console.error(`[vrs-route] error for ${callsign}:`, err);
    return jsonProxyResponse(
      request,
      { error: "Internal error" },
      { status: 500 },
    );
  }
}
