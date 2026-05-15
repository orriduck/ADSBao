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
  createAdaptiveProviderSelector,
  raceProviders,
} from "@/services/aviation/providerHealth.js";

const rateLimit = {
  key: "proxy:aircraft-positions",
  maxRequests: 120,
  windowMs: 60_000,
};

const USER_AGENT = "ADSBao/0.11.0 (https://github.com/orriduck/ADSBao)";
const POSITION_MAX_BYTES = 2 * 1024 * 1024;

// Module-level selector — survives between warm-instance invocations on
// Vercel so the "preferred provider" sticks until it errors out.
const selector = createAdaptiveProviderSelector();

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
    throw new ProviderError(`network: ${networkError.message}`);
  }

  if (!response.ok) {
    throw new ProviderError(`HTTP ${response.status}`, response.status);
  }

  let payload;
  try {
    payload = await readResponseJson(response, {
      label: `${provider.id} aircraft response`,
      maxBytes: POSITION_MAX_BYTES,
    });
  } catch (parseError) {
    throw new ProviderError(`parse: ${parseError.message}`);
  }

  if (!payload || typeof payload !== "object" || !Array.isArray(payload.ac)) {
    throw new ProviderError("Invalid aircraft payload");
  }

  return payload;
}

class ProviderError extends Error {
  constructor(message, status = null) {
    super(message);
    this.status = status;
  }
}

function formatAttempt(providerId, error) {
  if (!error) return `${providerId}:200`;
  return `${providerId}:${error.status || "ERR"}`;
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

  const fetcher = (provider) =>
    fetchProviderPayload(provider, { latitude, longitude, distanceNm });
  const attempts = [];

  // Phase 1: if we have a sticky winner from a prior request, try it alone.
  const preferredId = selector.getPreferredId();
  const preferred = preferredId
    ? POSITION_PROVIDER_CHAIN.find((p) => p.id === preferredId)
    : null;

  if (preferred) {
    try {
      const payload = await fetcher(preferred);
      attempts.push(formatAttempt(preferred.id));
      return successResponse(request, preferred, payload, attempts);
    } catch (error) {
      attempts.push(formatAttempt(preferred.id, error));
      console.warn(
        `[aircraft-positions] preferred ${preferred.id} failed, racing`,
        error.status ? `status=${error.status}` : error.message,
      );
      selector.clear();
      // Fall through to the race.
    }
  }

  // Phase 2: no winner (or preferred just failed) → race all providers,
  // first non-error response wins and becomes the new sticky winner.
  let raceResult;
  try {
    raceResult = await raceProviders(POSITION_PROVIDER_CHAIN, fetcher);
  } catch (aggregate) {
    const errors = aggregate?.errors || [aggregate];
    for (let i = 0; i < POSITION_PROVIDER_CHAIN.length; i += 1) {
      const provider = POSITION_PROVIDER_CHAIN[i];
      const error = errors[i];
      attempts.push(formatAttempt(provider.id, error));
      console.warn(
        `[aircraft-positions] race: ${provider.id} failed`,
        error?.status ? `status=${error.status}` : error?.message,
      );
    }
    const lastError = errors[errors.length - 1];
    return jsonProxyResponse(
      request,
      { error: "Failed to load aircraft positions" },
      {
        status: Number(lastError?.status) || 502,
        headers: {
          "X-Data-Source": "failed",
          "X-Provider-Attempts": attempts.join(";") || "none",
        },
      },
    );
  }

  const { provider, payload } = raceResult;
  selector.setPreferredId(provider.id);
  attempts.push(formatAttempt(provider.id));
  return successResponse(request, provider, payload, attempts);
}

function successResponse(request, provider, payload, attempts) {
  return Response.json(
    { ...payload, source: provider.id },
    {
      headers: buildProxyHeaders(request, {
        "Cache-Control": "no-store",
        "X-Data-Source": provider.id,
        "X-Provider-Attempts": attempts.join(";"),
      }),
    },
  );
}
