import {
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
  normalizeLatitude,
  normalizeLongitude,
} from "@/app/api/_shared/apiProxySecurity";
import {
  getNearbyAirports,
} from "@/features/airport/nearby/nearbyAirports.mechanism";
import {
  NEARBY_AIRPORT_CACHE_HEADERS,
} from "@/features/airport/nearby/nearbyAirports.models";
import {
  isValidNearbyAirportQuery,
  normalizeNearbyAirportQuery,
  readNearbyAirportNumber,
} from "@/features/airport/nearby/nearbyAirports.utils";

const rateLimit = {
  key: "proxy:nearby-airports",
  maxRequests: 45,
  windowMs: 60_000,
};

export const runtime = "nodejs";

export function OPTIONS(request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request) {
  const securityResponse = enforceProxyRequest(request, { rateLimit });
  if (securityResponse) return securityResponse;

  const url = new URL(request.url);
  const query = normalizeNearbyAirportQuery({
    lat: normalizeLatitude(url.searchParams.get("lat")),
    lon: normalizeLongitude(url.searchParams.get("lon")),
    icao: url.searchParams.get("icao"),
    radiusNm: readNearbyAirportNumber(url.searchParams, "radiusNm"),
    limit: readNearbyAirportNumber(url.searchParams, "limit"),
  });

  if (!Number.isFinite(query.lat) || !Number.isFinite(query.lon)) {
    return jsonProxyResponse(
      request,
      { error: "lat and lon query parameters are required" },
      { status: 400 },
    );
  }

  if (!isValidNearbyAirportQuery(query)) {
    return jsonProxyResponse(
      request,
      { error: "Invalid nearby airport query" },
      { status: 400 },
    );
  }

  try {
    const payload = await getNearbyAirports({ query });
    return jsonProxyResponse(request, payload, {
      headers: NEARBY_AIRPORT_CACHE_HEADERS,
    });
  } catch (error) {
    console.error("[airports/nearby] OpenAIP nearby query failed", error);
    return jsonProxyResponse(
      request,
      { error: "Failed to load nearby airports" },
      { status: 502 },
    );
  }
}
