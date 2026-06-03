import {
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
} from "@/app/api/_shared/apiProxySecurity";
import {
  getWaypointTile,
} from "@/features/airport/context/aviationContextTile.mechanism";
import {
  WAYPOINT_TILE_CACHE_HEADERS,
  normalizeContextTileParams,
} from "@/features/airport/context/aviationContextTileModel";
import { AirportDirectoryConfigurationError } from "@/features/airport/directory/airportDirectory.models";

const rateLimit = {
  key: "api:waypoint-tile",
  maxRequests: 90,
  windowMs: 60_000,
};

export const runtime = "nodejs";

export function OPTIONS(request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request, { params }) {
  const securityResponse = enforceProxyRequest(request, { rateLimit });
  if (securityResponse) return securityResponse;

  const tile = normalizeContextTileParams(await params);
  if (!tile) {
    return jsonProxyResponse(
      request,
      { error: "Invalid waypoint tile" },
      { status: 400 },
    );
  }

  try {
    const payload = await getWaypointTile({ tile });
    return jsonProxyResponse(request, payload, {
      headers: WAYPOINT_TILE_CACHE_HEADERS,
    });
  } catch (error) {
    if (error instanceof AirportDirectoryConfigurationError) {
      return jsonProxyResponse(
        request,
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("[api/waypoints] tile load failed", error);
    return jsonProxyResponse(
      request,
      { error: "Failed to load waypoint tile" },
      { status: 502 },
    );
  }
}
