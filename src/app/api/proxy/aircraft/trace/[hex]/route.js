import {
  buildProxyHeaders,
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
  normalizeAircraftHex,
  readResponseJson,
} from "@/services/apiProxySecurity.js";
import { TRACE_PROVIDER_CHAIN } from "@/services/aviation/aircraftDataProviders.js";
import {
  createProviderHealthTracker,
  isRetriableStatus,
  selectProviderOrder,
} from "@/services/aviation/providerHealth.js";

const rateLimit = {
  key: "proxy:aircraft-trace",
  maxRequests: 60,
  windowMs: 60_000,
};

const USER_AGENT = "ADSBao/0.10.0 (https://github.com/orriduck/ADSBao)";
const TRACE_MAX_BYTES = 6 * 1024 * 1024;
const healthTracker = createProviderHealthTracker();

export function OPTIONS(request) {
  return createCorsPreflightResponse(request);
}

async function fetchTraceFromProvider(provider, { hex }) {
  if (!provider.buildTraceUrl) {
    const error = new Error(`${provider.id} has no trace endpoint`);
    error.retriable = true;
    throw error;
  }

  const url = provider.buildTraceUrl({ hex });

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

  if (response.status === 404) return null;
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    error.status = response.status;
    error.retriable = isRetriableStatus(response.status);
    throw error;
  }

  try {
    return await readResponseJson(response, {
      label: `${provider.id} aircraft trace response`,
      maxBytes: TRACE_MAX_BYTES,
    });
  } catch (parseError) {
    const error = new Error(`parse: ${parseError.message}`);
    error.retriable = true;
    throw error;
  }
}

export async function GET(request, { params }) {
  const securityResponse = enforceProxyRequest(request, { rateLimit });
  if (securityResponse) return securityResponse;

  const { hex: rawHex } = await params;
  const hex = normalizeAircraftHex(rawHex);
  if (!hex) {
    return jsonProxyResponse(
      request,
      { error: "Invalid aircraft trace query" },
      { status: 400 },
    );
  }

  const providers = selectProviderOrder(TRACE_PROVIDER_CHAIN, healthTracker);
  let lastError = null;

  for (const provider of providers) {
    try {
      const recent = await fetchTraceFromProvider(provider, { hex });
      if (!recent) {
        return jsonProxyResponse(
          request,
          { error: "Aircraft trace not found" },
          { status: 404 },
        );
      }
      return Response.json(
        { hex, recent },
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
        `[aircraft-trace] ${provider.id} failed`,
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
    { error: "Failed to load aircraft trace" },
    { status: Number(lastError?.status) || 502 },
  );
}
