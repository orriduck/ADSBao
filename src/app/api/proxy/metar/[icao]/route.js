import {
  buildProxyHeaders,
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
  normalizeIcao,
  readResponseJson,
} from "@/services/apiProxySecurity.js";

const rateLimit = {
  key: "proxy:metar",
  maxRequests: 90,
  windowMs: 60_000,
};

const USER_AGENT = "ADSBao/0.9.0 (https://github.com/orriduck/ADSBao)";

export function OPTIONS(request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request, { params }) {
  const securityResponse = enforceProxyRequest(request, { rateLimit });
  if (securityResponse) return securityResponse;

  const { icao: rawIcao = "" } = await params;
  const icao = normalizeIcao(rawIcao);

  if (!icao) {
    return jsonProxyResponse(request, { error: "Invalid ICAO" }, { status: 400 });
  }

  const url = new URL("https://aviationweather.gov/api/data/metar");
  url.searchParams.set("ids", icao);
  url.searchParams.set("format", "json");

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      next: {
        revalidate: 60,
      },
    });

    if (!response.ok) {
      return jsonProxyResponse(
        request,
        { error: "Failed to load METAR" },
        { status: response.status },
      );
    }

    if (response.status === 204) {
      return Response.json([], {
        headers: buildProxyHeaders(request, {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        }),
      });
    }

    const payload = await readResponseJson(response, {
      label: "AviationWeather METAR response",
      maxBytes: 512 * 1024,
    });

    if (!Array.isArray(payload)) {
      return jsonProxyResponse(
        request,
        { error: "Invalid METAR payload" },
        { status: 502 },
      );
    }

    return Response.json(payload, {
      headers: buildProxyHeaders(request, {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      }),
    });
  } catch (error) {
    console.error(`[metar] load failed for ${icao}`, error);
    return jsonProxyResponse(
      request,
      { error: "Failed to load METAR" },
      { status: 502 },
    );
  }
}
