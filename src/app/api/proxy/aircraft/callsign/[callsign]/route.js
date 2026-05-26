import {
  buildProxyHeaders,
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
} from "@/app/api/_shared/apiProxySecurity.js";
import { currentUser } from "@clerk/nextjs/server";
import {
  isFlightAwareEnabledForUser,
} from "@/features/app-shell/feature-flags/userFeatureFlags.server.js";
import {
  fetchTrackedAircraftByCallsign,
} from "@/features/aircraft/callsign/aircraftCallsign.mechanism.js";
import {
  AircraftCallsignProviderError,
} from "@/features/aircraft/callsign/aircraftCallsign.models.js";
import { normalizeRouteCallsign } from "@/features/aviation/flight-routes/flightRouteCallsign.js";

const rateLimit = {
  key: "proxy:aircraft-callsign",
  maxRequests: 120,
  windowMs: 60_000,
};

export function OPTIONS(request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request, { params }) {
  const securityResponse = enforceProxyRequest(request, { rateLimit });
  if (securityResponse) return securityResponse;

  const { callsign: rawCallsign } = await params;
  const callsign = normalizeRouteCallsign(rawCallsign);

  if (!callsign) {
    return jsonProxyResponse(
      request,
      { error: "Invalid aircraft callsign" },
      { status: 400 },
    );
  }

  try {
    const user = await currentUser();
    const flightAwareEnabled = await isFlightAwareEnabledForUser({ user });
    const result = await fetchTrackedAircraftByCallsign({
      callsign,
      featureEnabled: flightAwareEnabled,
    });
    return Response.json(result.payload, {
      headers: buildProxyHeaders(request, {
        "Cache-Control": "no-store",
        "X-Data-Source": result.source,
        "X-Provider-Attempts": result.attempts.join(";"),
      }),
    });
  } catch (error) {
    if (error instanceof AircraftCallsignProviderError) {
      return jsonProxyResponse(
        request,
        { error: error.message },
        {
          status: Number(error.status) || 502,
          headers: {
            "X-Data-Source": "failed",
            "X-Provider-Attempts": error.attempts?.join(";") || "none",
          },
        },
      );
    }
    throw error;
  }
}
