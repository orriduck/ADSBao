import {
  buildProxyHeaders,
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
  normalizeIcao,
} from "@/app/api/_shared/apiProxySecurity.js";
import { fetchMetar } from "@/features/weather/metar/metar.mechanism.js";
import {
  METAR_CACHE_HEADERS,
  MetarProviderError,
} from "@/features/weather/metar/metar.models.js";

const rateLimit = {
  key: "proxy:metar",
  maxRequests: 90,
  windowMs: 60_000,
};

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

  try {
    const payload = await fetchMetar({ icao });
    return Response.json(payload, {
      headers: buildProxyHeaders(request, METAR_CACHE_HEADERS),
    });
  } catch (error) {
    if (error instanceof MetarProviderError && error.message === "Invalid METAR payload") {
      return jsonProxyResponse(
        request,
        { error: "Invalid METAR payload" },
        { status: 502 },
      );
    }
    if (error instanceof MetarProviderError && error.status !== 502) {
      return jsonProxyResponse(
        request,
        { error: "Failed to load METAR" },
        { status: error.status },
      );
    }
    console.error(`[metar] load failed for ${icao}`, error);
    return jsonProxyResponse(
      request,
      { error: "Failed to load METAR" },
      { status: 502 },
    );
  }
}
