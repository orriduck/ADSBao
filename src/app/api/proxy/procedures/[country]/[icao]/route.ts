import {
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
} from "@/app/api/_shared/apiProxySecurity";
import {
  getAirportProcedures,
} from "@/features/airport/procedures/procedures.mechanism";
import {
  PROCEDURE_CACHE_HEADERS,
  ProcedureNotFoundError,
} from "@/features/airport/procedures/procedures.models";
import {
  isSupportedFaaProcedureAirport,
  normalizeProcedureCountry,
  normalizeProcedureIcao,
} from "@/features/airport/procedures/procedures.utils";

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
    const payload = await getAirportProcedures({ icao: normalizedIcao });
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
    console.error(`[procedures] FAA CIFP load failed for ${normalizedIcao}`, error);
    return jsonProxyResponse(
      request,
      { error: "Failed to load FAA CIFP procedures" },
      { status: 502 },
    );
  }
}
