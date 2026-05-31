import {
  buildProxyHeaders,
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
} from "@/app/api/_shared/apiProxySecurity";
import {
  fetchLocalWeather,
} from "@/features/weather/localWeather.mechanism";
import {
  LocalWeatherProviderError,
} from "@/features/weather/localWeather.models";
import {
  normalizeLatitudeParam,
  normalizeLongitudeParam,
} from "@/features/weather/localWeather.utils";

const rateLimit = {
  key: "proxy:local-weather",
  maxRequests: 90,
  windowMs: 60_000,
};

export function OPTIONS(request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request, { params }) {
  const securityResponse = enforceProxyRequest(request, { rateLimit });
  if (securityResponse) return securityResponse;

  const { lat, lon } = await params;
  const latitude = normalizeLatitudeParam(lat);
  const longitude = normalizeLongitudeParam(lon);

  if (latitude == null || longitude == null) {
    return jsonProxyResponse(
      request,
      { error: "Invalid coordinates" },
      { status: 400 },
    );
  }

  try {
    const result = await fetchLocalWeather({ latitude, longitude });
    return Response.json(result.payload, {
      status: result.status,
      headers: buildProxyHeaders(request),
    });
  } catch (error) {
    if (error instanceof LocalWeatherProviderError && error.message === "Invalid weather payload") {
      return jsonProxyResponse(
        request,
        { error: "Invalid weather payload" },
        { status: 502 },
      );
    }
    if (error instanceof LocalWeatherProviderError && error.status !== 502) {
      return jsonProxyResponse(
        request,
        { error: "Failed to load weather" },
        { status: error.status },
      );
    }
    console.error("[local-weather] load failed", error);
    return jsonProxyResponse(
      request,
      { error: "Failed to load weather" },
      { status: 502 },
    );
  }
}
