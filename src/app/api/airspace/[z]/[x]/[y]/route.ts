import {
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
} from "@/app/api/_shared/apiProxySecurity";
import {
  getAirspaceTile,
} from "@/features/airport/context/aviationContextTile.mechanism";
import {
  AIRSPACE_TILE_CACHE_HEADERS,
  normalizeContextTileParams,
} from "@/features/airport/context/aviationContextTileModel";
import { AirportDirectoryConfigurationError } from "@/features/airport/directory/airportDirectory.models";

const rateLimit = {
  key: "api:airspace-tile",
  maxRequests: 90,
  windowMs: 60_000,
};

export const runtime = "nodejs";

const numberOrNull = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

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
      { error: "Invalid airspace tile" },
      { status: 400 },
    );
  }

  try {
    const url = new URL(request.url);
    const altitudeFtMsl = numberOrNull(url.searchParams.get("altitudeFt"));
    const payload = await getAirspaceTile({ tile, altitudeFtMsl });
    return jsonProxyResponse(request, payload, {
      headers: AIRSPACE_TILE_CACHE_HEADERS,
    });
  } catch (error) {
    if (error instanceof AirportDirectoryConfigurationError) {
      return jsonProxyResponse(
        request,
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("[api/airspace] tile load failed", error);
    return jsonProxyResponse(
      request,
      { error: "Failed to load airspace tile" },
      { status: 502 },
    );
  }
}
