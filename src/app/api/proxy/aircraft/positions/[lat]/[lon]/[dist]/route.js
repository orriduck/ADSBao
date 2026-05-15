import {
  buildProxyHeaders,
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
  normalizeDistanceNm,
  normalizeLatitude,
  normalizeLongitude,
  readResponseJson,
} from "@/services/apiProxySecurity.js";
import { POSITION_PROVIDER_CHAIN } from "@/services/aviation/aircraftDataProviders.js";
import {
  createProviderHealthTracker,
  isRetriableStatus,
  selectProviderOrder,
} from "@/services/aviation/providerHealth.js";

const rateLimit = {
  key: "proxy:aircraft-positions",
  maxRequests: 120,
  windowMs: 60_000,
};

const USER_AGENT = "ADSBao/0.10.0 (https://github.com/orriduck/ADSBao)";
const POSITION_MAX_BYTES = 2 * 1024 * 1024;
const healthTracker = createProviderHealthTracker();

export function OPTIONS(request) {
  return createCorsPreflightResponse(request);
}

async function fetchProviderPayload(provider, { latitude, longitude, distanceNm }) {
  const url = provider.buildPositionUrl({
    lat: latitude,
    lon: longitude,
    distanceNm,
  });

  let response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      next: { revalidate: 0 },
    });
  } catch (networkError) {
    const error = new Error(`network: ${networkError.message}`);
    error.retriable = true;
    throw error;
  }

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    error.status = response.status;
    error.retriable = isRetriableStatus(response.status);
    throw error;
  }

  let payload;
  try {
    payload = await readResponseJson(response, {
      label: `${provider.id} aircraft response`,
      maxBytes: POSITION_MAX_BYTES,
    });
  } catch (parseError) {
    const error = new Error(`parse: ${parseError.message}`);
    error.retriable = true;
    throw error;
  }

  if (!payload || typeof payload !== "object" || !Array.isArray(payload.ac)) {
    const error = new Error("Invalid aircraft payload");
    error.retriable = true;
    throw error;
  }

  return payload;
}

export async function GET(request, { params }) {
  const securityResponse = enforceProxyRequest(request, { rateLimit });
  if (securityResponse) return securityResponse;

  const { lat, lon, dist } = await params;
  const latitude = normalizeLatitude(lat);
  const longitude = normalizeLongitude(lon);
  const distanceNm = normalizeDistanceNm(dist, { min: 1, max: 250 });

  if (latitude == null || longitude == null || distanceNm == null) {
    return jsonProxyResponse(
      request,
      { error: "Invalid aircraft position query" },
      { status: 400 },
    );
  }

  const providers = selectProviderOrder(POSITION_PROVIDER_CHAIN, healthTracker);
  let lastError = null;

  for (const provider of providers) {
    try {
      const payload = await fetchProviderPayload(provider, {
        latitude,
        longitude,
        distanceNm,
      });
      return Response.json(
        { ...payload, source: provider.id },
        {
          headers: buildProxyHeaders(request, {
            "Cache-Control": "no-store",
            "X-Data-Source": provider.id,
          }),
        },
      );
    } catch (error) {
      lastError = error;
      console.warn(
        `[aircraft-positions] ${provider.id} failed`,
        error.status ? `status=${error.status}` : error.message,
      );
      if (error.retriable) {
        healthTracker.markUnhealthy(provider.id);
        continue;
      }
      break;
    }
  }

  return jsonProxyResponse(
    request,
    { error: "Failed to load aircraft positions" },
    { status: Number(lastError?.status) || 502 },
  );
}
