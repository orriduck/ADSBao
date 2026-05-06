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

  const html = await response.text();
  return extractFlightAwareTargeting(html);
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

export function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function GET(_request, { params }) {
  const { callsign: rawCallsign = "" } = await params;
  const callsign = normalizeRouteCallsign(rawCallsign);

  if (!callsign) {
    return Response.json(
      { error: "Invalid callsign" },
      { status: 400, headers: corsHeaders },
    );
  }

  try {
    const scraped = await scrapeFlightAware(callsign);
    const body = buildFlightAwareRouteResponse(callsign, scraped);

    return Response.json(body, {
      status: scraped ? 200 : 404,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error(`[flight-scraper] error for ${callsign}:`, err);
    return Response.json(
      { error: "Internal error" },
      { status: 500, headers: corsHeaders },
    );
  }
}
