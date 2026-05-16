import {
  buildProxyHeaders,
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
} from "@/app/api/_shared/apiProxySecurity.js";
import {
  normalizeRouteCallsign,
} from "@/features/flight-routes/vrsRouteProxyModel.js";
import {
  buildRouteCacheHeaders,
  VRS_ROUTE_MISS_STATUS,
} from "@/features/flight-routes/flightRoutes.models.js";
import {
  resolveFlightRoute,
} from "@/features/flight-routes/flightRoutes.mechanism.js";
import {
  getTargetAirportFromSearchParams,
  shouldForceAerodatabox,
} from "@/features/flight-routes/flightRoutes.utils.js";

const rateLimit = {
  key: "proxy:flight-routes",
  maxRequests: 360,
  windowMs: 60_000,
};

export function OPTIONS(request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request, { params }) {
  const securityResponse = enforceProxyRequest(request, { rateLimit });
  if (securityResponse) return securityResponse;

  const { callsign: rawCallsign = "" } = await params;
  const callsign = normalizeRouteCallsign(rawCallsign);

  if (!callsign) {
    return jsonProxyResponse(
      request,
      { error: "Invalid callsign" },
      { status: 400 },
    );
  }

  try {
    const forceAerodatabox = shouldForceAerodatabox(request.nextUrl?.searchParams);
    const body = await resolveFlightRoute({
      callsign,
      targetAirport: getTargetAirportFromSearchParams(
        request.nextUrl?.searchParams,
      ),
      forceAerodatabox,
    });

    const cacheHeaders = forceAerodatabox
      ? { "Cache-Control": "no-store" }
      : buildRouteCacheHeaders(body);

    return Response.json(body, {
      status: body ? 200 : VRS_ROUTE_MISS_STATUS,
      headers: buildProxyHeaders(request, cacheHeaders, {
        varyOrigin: false,
      }),
    });
  } catch (err) {
    console.error(`[vrs-route] error for ${callsign}:`, err);
    return jsonProxyResponse(
      request,
      { error: "Internal error" },
      { status: 500 },
    );
  }
}
