import {
  buildProxyHeaders,
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
  readResponseJson,
} from "@/services/apiProxySecurity.js";
import {
  buildVrsRouteResponse,
  buildVrsRouteUrl,
  normalizeRouteCallsign,
  VRS_ROUTE_MISS_STATUS,
  VRS_ROUTE_USER_AGENT,
} from "@/services/aviation/vrsRouteProxyModel.js";

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
    const body = await fetchVrsStandingRoute(callsign);

    return Response.json(body, {
      status: body ? 200 : VRS_ROUTE_MISS_STATUS,
      headers: buildProxyHeaders(request),
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
