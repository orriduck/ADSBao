import {
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
} from "@/services/apiProxySecurity.js";
import { buildLiveAirportProcedurePayload } from "@/services/procedures/faaCifpLiveDataClient.js";

const rateLimit = {
  key: "proxy:procedures",
  maxRequests: 45,
  windowMs: 60_000,
};

export const runtime = "nodejs";

export function OPTIONS(request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request, { params }) {
  const securityResponse = enforceProxyRequest(request, { rateLimit });
  if (securityResponse) return securityResponse;

  const { country = "", icao = "" } = await params;
  const normalizedCountry = country.toUpperCase();
  const normalizedIcao = icao.toUpperCase();

  if (normalizedCountry !== "US" || !/^K[A-Z0-9]{3}$/.test(normalizedIcao)) {
    return jsonProxyResponse(
      request,
      { error: "FAA CIFP procedures are available for US ICAO airports only" },
      { status: 404 },
    );
  }

  try {
    const payload = await buildLiveAirportProcedurePayload({
      airport: normalizedIcao,
    });

    if (!payload.index.approaches.length && !payload.runwayMap.runways.length) {
      return jsonProxyResponse(
        request,
        { error: `No FAA CIFP airport data found for ${normalizedIcao}` },
        { status: 404 },
      );
    }

    return jsonProxyResponse(request, payload, {
      headers: {
        "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error(`[procedures] FAA CIFP load failed for ${normalizedIcao}`, error);
    return jsonProxyResponse(
      request,
      { error: "Failed to load FAA CIFP procedures" },
      { status: 502 },
    );
  }
}
