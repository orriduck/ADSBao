const FLIGHTAWARE_BASE = "https://www.flightaware.com/live/flight";

const USER_AGENT =
  "ADSBao/0.9.0 (+https://github.com/orriduck/ADSBao) FlightAware-scraper/1.0";

const TARGETING_RE = /\.setTargeting\('(\w+)',\s*'([^']*)'\)/g;

async function scrapeFlightAware(callsign) {
  const url = `${FLIGHTAWARE_BASE}/${encodeURIComponent(callsign)}`;

  let response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
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
  const targeting = {};
  let match;
  while ((match = TARGETING_RE.exec(html)) !== null) {
    targeting[match[1]] = match[2];
  }
  TARGETING_RE.lastIndex = 0;

  const originIcao = targeting.origin || "";
  const originIata = targeting.origin_IATA || "";
  const destIcao = targeting.destination || "";
  const destIata = targeting.destination_IATA || "";

  if (!originIcao && !destIcao) return null;

  return {
    origin: { icao: originIcao, iata: originIata },
    destination: { icao: destIcao, iata: destIata },
  };
}

function buildResponse(callsign, scraped) {
  if (!scraped) return { response: null };

  return {
    response: {
      flightroute: {
        callsign: callsign.toUpperCase(),
        origin: {
          icao_code: scraped.origin.icao,
          iata_code: scraped.origin.iata,
          name: "",
          municipality: "",
          country_name: "",
          latitude: 0,
          longitude: 0,
        },
        destination: {
          icao_code: scraped.destination.icao,
          iata_code: scraped.destination.iata,
          name: "",
          municipality: "",
          country_name: "",
          latitude: 0,
          longitude: 0,
        },
        airline: {
          name: "",
          icao: callsign.slice(0, 3).toUpperCase(),
          iata: "",
        },
      },
    },
  };
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
  const callsign = rawCallsign.trim().toUpperCase().replace(/\s+/g, "");

  if (
    !callsign ||
    callsign.length < 3 ||
    !/^[A-Z][A-Z0-9]{2,7}$/.test(callsign)
  ) {
    return Response.json(
      { error: "Invalid callsign" },
      { status: 400, headers: corsHeaders },
    );
  }

  try {
    const scraped = await scrapeFlightAware(callsign);
    const body = buildResponse(callsign, scraped);

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
