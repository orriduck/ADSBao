import {
  buildProxyHeaders,
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
  readResponseJson,
} from "@/services/apiProxySecurity.js";
import {
  buildOpenMeteoCurrentWeatherUrl,
  isValidOpenMeteoCurrentPayload,
  normalizeLatitudeParam,
  normalizeLongitudeParam,
} from "@/services/aviation/localWeatherProxyModel.js";

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

  const url = buildOpenMeteoCurrentWeatherUrl({ latitude, longitude });

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "ADSBao/0.10.0 (https://github.com/orriduck/ADSBao)",
      },
      next: {
        revalidate: 300,
      },
    });

    if (!response.ok) {
      return jsonProxyResponse(
        request,
        { error: "Failed to load weather" },
        { status: response.status },
      );
    }

    const payload = await readResponseJson(response, {
      label: "Open-Meteo current weather response",
      maxBytes: 512 * 1024,
    });

    if (!isValidOpenMeteoCurrentPayload(payload)) {
      return jsonProxyResponse(
        request,
        { error: "Invalid weather payload" },
        { status: 502 },
      );
    }

    return Response.json(payload, {
      status: response.status,
      headers: buildProxyHeaders(request),
    });
  } catch (error) {
    console.error("[local-weather] load failed", error);
    return jsonProxyResponse(
      request,
      { error: "Failed to load weather" },
      { status: 502 },
    );
  }
}
