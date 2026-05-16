import {
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
} from "@/app/api/_shared/apiProxySecurity.js";
import {
  getAirportRunwayProcedures,
} from "@/features/airport/procedures/procedures.mechanism.js";
import {
  PROCEDURE_CACHE_HEADERS,
  ProcedureNotFoundError,
} from "@/features/airport/procedures/procedures.models.js";
import {
  isSupportedFaaProcedureAirport,
  normalizeProcedureCountry,
  normalizeProcedureIcao,
} from "@/features/airport/procedures/procedures.utils.js";

const rateLimit = {
  key: "proxy:procedure-runways",
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
  const normalizedCountry = normalizeProcedureCountry(country);
  const normalizedIcao = normalizeProcedureIcao(icao);

  if (
    !isSupportedFaaProcedureAirport({
      country: normalizedCountry,
      icao: normalizedIcao,
    })
  ) {
    return jsonProxyResponse(
      request,
      { error: "FAA CIFP procedures are available for US ICAO airports only" },
      { status: 404 },
    );
  }

  try {
    const payload = await getAirportRunwayProcedures({ icao: normalizedIcao });
    return jsonProxyResponse(request, payload, {
      headers: PROCEDURE_CACHE_HEADERS,
    });
  } catch (error) {
    if (error instanceof ProcedureNotFoundError) {
      return jsonProxyResponse(
        request,
        { error: error.message },
        { status: error.status },
      );
    }
    console.error(
      `[procedures/runways] FAA CIFP load failed for ${normalizedIcao}`,
      error,
    );
    return jsonProxyResponse(
      request,
      { error: "Failed to load FAA CIFP runway procedures" },
      { status: 502 },
    );
  }
}
