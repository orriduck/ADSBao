import {
  buildProxyHeaders,
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
  logProxyRouteResponse,
  normalizeDistanceNm,
  normalizeLatitude,
  normalizeLongitude,
} from "@/app/api/_shared/apiProxySecurity";
import {
  fetchAircraftPositions,
} from "@/features/aircraft/positions/aircraftPositions.mechanism";
import {
  AircraftPositionProviderError,
} from "@/features/aircraft/positions/aircraftPositions.models";

const rateLimit = {
  key: "proxy:aircraft-positions",
  maxRequests: 120,
  windowMs: 60_000,
};

export function OPTIONS(request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request, { params }) {
  const startedAt = performance.now();
  const securityResponse = enforceProxyRequest(request, { rateLimit });
  if (securityResponse) return securityResponse;

  const { lat, lon, dist } = await params;
  const latitude = normalizeLatitude(lat);
  const longitude = normalizeLongitude(lon);
  const distanceNm = normalizeDistanceNm(dist, { min: 1, max: 250 });

  if (latitude == null || longitude == null || distanceNm == null) {
    return jsonProxyResponse(
      request,
      { error: "Invalid aircraft position query" },
      { status: 400 },
    );
  }

  try {
    const result = await fetchAircraftPositions({
      latitude,
      longitude,
      distanceNm,
    });
    return logProxyRouteResponse({
      request,
      route: "/api/proxy/aircraft/positions",
      response: successResponse(request, result),
      startMs: startedAt,
    });
  } catch (error) {
    if (error instanceof AircraftPositionProviderError) {
      return logProxyRouteResponse({
        request,
        route: "/api/proxy/aircraft/positions",
        response: jsonProxyResponse(
          request,
          { error: error.message },
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
    throw error;
  }
}

function successResponse(request, result) {
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
}
