import {
  buildProxyHeaders,
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
  normalizeAircraftHex,
} from "@/app/api/_shared/apiProxySecurity.js";
import {
  getAircraftTrace,
} from "@/features/aircraft/trace/aircraftTrace.mechanism.js";
import {
  AircraftTraceProviderError,
} from "@/features/aircraft/trace/aircraftTrace.models.js";

const rateLimit = {
  key: "proxy:aircraft-trace",
  maxRequests: 60,
  windowMs: 60_000,
};

export function OPTIONS(request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request, { params }) {
  const securityResponse = enforceProxyRequest(request, { rateLimit });
  if (securityResponse) return securityResponse;

  const { hex: rawHex } = await params;
  const hex = normalizeAircraftHex(rawHex);
  if (!hex) {
    return jsonProxyResponse(
      request,
      { error: "Invalid aircraft trace query" },
      { status: 400 },
    );
  }

  // ?full=1 switches the upstream from trace_recent_*.json (rolling
  // tail) to trace_full_*.json (whole flight). Used on aircraft-detail
  // page init so the user sees the entire path on load.
  const full = new URL(request.url).searchParams.get("full") === "1";

  try {
    const result = await getAircraftTrace({ hex, full });
    if (!result.found) {
      return jsonProxyResponse(
        request,
        { error: "Aircraft trace not found" },
        {
          status: 404,
          headers: {
            "X-Data-Source": result.source,
            "X-Provider-Attempts": result.attempts.join(";"),
          },
        },
      );
    }
    return Response.json(
      result.payload,
      {
        headers: buildProxyHeaders(request, {
          "Cache-Control": "no-store",
          "X-Data-Source": result.source,
          "X-Provider-Attempts": result.attempts.join(";"),
        }),
      },
    );
  } catch (error) {
    if (!(error instanceof AircraftTraceProviderError)) throw error;
    return jsonProxyResponse(
      request,
      { error: "Failed to load aircraft trace" },
      {
        status: Number(error.status) || 502,
        headers: {
          "X-Data-Source": "failed",
          "X-Provider-Attempts": error.attempts?.join(";") || "none",
        },
      },
    );
  }
}
