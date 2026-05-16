import {
  buildProxyHeaders,
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
  normalizeAircraftHex,
} from "@/services/apiProxySecurity.js";
import {
  getAircraftPhoto,
} from "@/server/aircraft-photos/aircraftPhotos.mechanism.js";
import {
  AIRCRAFT_PHOTO_CACHE_HEADERS,
  AIRCRAFT_PHOTO_SOURCE,
  AircraftPhotoProviderError,
} from "@/server/aircraft-photos/aircraftPhotos.models.js";
import {
  buildAircraftPhotoQuery,
} from "@/server/aircraft-photos/aircraftPhotos.utils.js";

const rateLimit = {
  key: "proxy:aircraft-photos",
  maxRequests: 90,
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
      { error: "Invalid aircraft photo query" },
      { status: 400 },
    );
  }

  try {
    const requestUrl = new URL(request.url);
    const photo = await getAircraftPhoto({
      hex,
      origin: requestUrl.origin,
      ...buildAircraftPhotoQuery(requestUrl.searchParams),
    });
    if (!photo) {
      return jsonProxyResponse(
        request,
        { error: "Aircraft photo not found" },
        {
          status: 404,
          headers: {
            ...AIRCRAFT_PHOTO_CACHE_HEADERS,
            "X-Data-Source": AIRCRAFT_PHOTO_SOURCE,
          },
        },
      );
    }

    return Response.json(
      { hex, photo },
      {
        headers: buildProxyHeaders(request, AIRCRAFT_PHOTO_CACHE_HEADERS),
      },
    );
  } catch (error) {
    if (!(error instanceof AircraftPhotoProviderError)) throw error;
    console.warn(
      "[aircraft-photo] planespotters.net failed",
      error.status ? `status=${error.status}` : error.message,
    );
    return jsonProxyResponse(
      request,
      { error: "Failed to load aircraft photo" },
      {
        status: Number(error.status) || 502,
        headers: {
          "Cache-Control": "no-store",
          "X-Data-Source": "failed",
        },
      },
    );
  }
}
