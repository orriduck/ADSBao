import {
  buildProxyHeaders,
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
  readResponseText,
} from "@/services/apiProxySecurity.js";
import {
  buildFlightAwareRouteResponse,
  buildFlightAwareUrl,
  extractFlightAwareTargeting,
  FLIGHTAWARE_USER_AGENT,
  normalizeRouteCallsign,
} from "@/services/aviation/flightAwareProxyModel.js";

async function scrapeFlightAware(callsign) {
  let response;
  try {
    response = await fetch(buildFlightAwareUrl(callsign), {
      headers: {
        "User-Agent": FLIGHTAWARE_USER_AGENT,
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(9_000),
    });
  } catch (err) {
    console.warn(`[flight-scraper] fetch failed for ${callsign}:`, err.message);
    return null;
  }

  if (!response.ok) {
    console.warn(`[flight-scraper] HTTP ${response.status} for ${callsign}`);
    return null;
  }

  const html = await readResponseText(response, {
    label: "FlightAware route page",
    maxBytes: 512 * 1024,
  });
  return extractFlightAwareTargeting(html);
}

const rateLimit = {
  key: "proxy:flight-routes",
  maxRequests: 30,
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
    const scraped = await scrapeFlightAware(callsign);
    const body = buildFlightAwareRouteResponse(callsign, scraped);

    return Response.json(body, {
      status: scraped ? 200 : 404,
      headers: buildProxyHeaders(request),
    });
  } catch (err) {
    console.error(`[flight-scraper] error for ${callsign}:`, err);
    return jsonProxyResponse(
      request,
      { error: "Internal error" },
      { status: 500 },
    );
  }
}
