import {
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
} from "@/app/api/_shared/apiProxySecurity";
import {
  getNavaidCountTile,
} from "@/features/airport/context/aviationContextTile.mechanism";
import {
  NAVAID_COUNT_TILE_CACHE_HEADERS,
  normalizeContextTileParams,
} from "@/features/airport/context/aviationContextTileModel";
import { AirportDirectoryConfigurationError } from "@/features/airport/directory/airportDirectory.models";

const rateLimit = {
  key: "api:navaid-count-tile",
  maxRequests: 180,
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
      { error: "Invalid navaid count tile" },
      { status: 400 },
    );
  }

  try {
    const payload = await getNavaidCountTile({ tile });
    return jsonProxyResponse(request, payload, {
      headers: NAVAID_COUNT_TILE_CACHE_HEADERS,
    });
  } catch (error) {
    if (error instanceof AirportDirectoryConfigurationError) {
      return jsonProxyResponse(
        request,
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("[api/navaid-counts] tile load failed", error);
    return jsonProxyResponse(
      request,
      { error: "Failed to load navaid count tile" },
      { status: 502 },
    );
  }
}
