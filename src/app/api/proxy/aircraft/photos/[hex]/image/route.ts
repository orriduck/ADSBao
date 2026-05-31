import {
  buildProxyHeaders,
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
  normalizeAircraftHex,
} from "@/app/api/_shared/apiProxySecurity";
import {
  getAircraftPhotoImage,
} from "@/features/aircraft/photos/aircraftPhotos.mechanism";
import {
  AIRCRAFT_PHOTO_CACHE_HEADERS,
  AIRCRAFT_PHOTO_SOURCE,
  AircraftPhotoProviderError,
} from "@/features/aircraft/photos/aircraftPhotos.models";
import {
  buildAircraftPhotoQuery,
} from "@/features/aircraft/photos/aircraftPhotos.utils";

const rateLimit = {
  key: "proxy:aircraft-photo-image",
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
    const image = await getAircraftPhotoImage({
      hex,
      ...buildAircraftPhotoQuery(requestUrl.searchParams),
    });
    if (!image) {
      return jsonProxyResponse(
        request,
        { error: "Aircraft photo not found" },
        { status: 404, headers: { "X-Data-Source": AIRCRAFT_PHOTO_SOURCE } },
      );
    }

    return new Response(image.body, {
      headers: buildProxyHeaders(request, {
        "Cache-Control": AIRCRAFT_PHOTO_CACHE_HEADERS["Cache-Control"],
        "Content-Type": image.contentType,
        "X-Data-Source": AIRCRAFT_PHOTO_SOURCE,
      }),
    });
  } catch (error) {
    if (!(error instanceof AircraftPhotoProviderError)) throw error;
    console.warn(
      "[aircraft-photo-image] planespotters.net failed",
      error.status ? `status=${error.status}` : error.message,
    );
    return jsonProxyResponse(
      request,
      { error: "Failed to load aircraft photo image" },
      {
        status: Number(error.status) || 502,
        headers: { "Cache-Control": "no-store", "X-Data-Source": "failed" },
      },
    );
  }
}
