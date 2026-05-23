import {
  buildProxyHeaders,
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
} from "@/app/api/_shared/apiProxySecurity.js";
import { normalizeRouteCallsign } from "@/features/aviation/flight-routes/flightRouteCallsign.js";
import {
  ROUTE_MISS_STATUS,
  buildRouteCacheHeaders,
} from "@/features/aviation/flight-routes/flightRoutes.models.js";
import { resolveFlightRoute } from "@/features/aviation/flight-routes/flightRoutes.mechanism.js";

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
    const requestedProvider = String(
      request.nextUrl?.searchParams?.get("provider") || "",
    )
      .trim()
      .toLowerCase();
    const providerSpecificRequest = requestedProvider === "flightaware";
    const body = await resolveFlightRoute({ callsign });

    return Response.json(body, {
      status: body ? 200 : ROUTE_MISS_STATUS,
      headers: buildProxyHeaders(
        request,
        {
          ...buildRouteCacheHeaders(body, {
            bypassSharedCache: providerSpecificRequest,
          }),
          // Expose the resolved upstream so the Network tab makes it
          // obvious which provider answered ("flightaware", "adsbdb",
          // "community-feedback", or "none" on a miss).
          "X-Route-Source": body?.source || "none",
        },
        { varyOrigin: false },
      ),
    });
  } catch (err) {
    console.error(`[adsbdb-route] error for ${callsign}:`, err);
    return jsonProxyResponse(
      request,
      { error: "Internal error" },
      { status: 500 },
    );
  }
}
