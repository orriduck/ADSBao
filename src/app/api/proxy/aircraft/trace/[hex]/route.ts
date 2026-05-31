import {
  buildProxyHeaders,
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
  logProxyRouteResponse,
  normalizeAircraftHex,
} from "@/app/api/_shared/apiProxySecurity";
import {
  getAircraftTrace,
} from "@/features/aircraft/trace/aircraftTrace.mechanism";
import {
  AircraftTraceProviderError,
} from "@/features/aircraft/trace/aircraftTrace.models";

const rateLimit = {
  key: "proxy:aircraft-trace",
  maxRequests: 60,
  windowMs: 60_000,
};

export function OPTIONS(request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request, { params }) {
  const startedAt = performance.now();
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
      return logProxyRouteResponse({
        request,
        route: "/api/proxy/aircraft/trace",
        response: jsonProxyResponse(
          request,
          { error: "Aircraft trace not found" },
          {
            status: 404,
            headers: {
              "X-Data-Source": result.source,
              "X-Provider-Attempts": result.attempts.join(";"),
            },
          },
        ),
        startMs: startedAt,
      });
    }
    return logProxyRouteResponse({
      request,
      route: "/api/proxy/aircraft/trace",
      response: Response.json(result.payload, {
        headers: buildProxyHeaders(request, {
          "Cache-Control": "no-store",
          "X-Data-Source": result.source,
          "X-Provider-Attempts": result.attempts.join(";"),
        }),
      }),
      startMs: startedAt,
    });
  } catch (error) {
    if (!(error instanceof AircraftTraceProviderError)) throw error;
    return logProxyRouteResponse({
      request,
      route: "/api/proxy/aircraft/trace",
      response: jsonProxyResponse(
        request,
        { error: "Failed to load aircraft trace" },
        {
          status: Number(error.status) || 502,
          headers: {
            "X-Data-Source": "failed",
            "X-Provider-Attempts": error.attempts?.join(";") || "none",
          },
        },
      ),
      startMs: startedAt,
    });
  }
}
