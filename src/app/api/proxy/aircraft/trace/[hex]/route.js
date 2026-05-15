import {
  buildProxyHeaders,
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
  normalizeAircraftHex,
  readResponseJson,
} from "@/services/apiProxySecurity.js";

const rateLimit = {
  key: "proxy:aircraft-trace",
  maxRequests: 60,
  windowMs: 60_000,
};

const USER_AGENT = "ADSBao/0.10.0 (https://github.com/orriduck/ADSBao)";
const TRACE_MAX_BYTES = 6 * 1024 * 1024;

export function OPTIONS(request) {
  return createCorsPreflightResponse(request);
}

function buildRecentTraceUrl(hex) {
  const suffix = hex.slice(-2).toLowerCase();
  return `https://adsb.lol/data/traces/${suffix}/trace_recent_${hex.toLowerCase()}.json`;
}

async function fetchTracePayload(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    next: {
      revalidate: 0,
    },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return readResponseJson(response, {
    label: "adsb.lol aircraft trace response",
    maxBytes: TRACE_MAX_BYTES,
  });
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

  try {
    const recent = await fetchTracePayload(buildRecentTraceUrl(hex));

    if (!recent) {
      return jsonProxyResponse(
        request,
        { error: "Aircraft trace not found" },
        { status: 404 },
      );
    }

    return Response.json(
      {
        hex,
        recent,
      },
      {
        headers: buildProxyHeaders(request, {
          "Cache-Control": "no-store",
        }),
      },
    );
  } catch (error) {
    console.error("[aircraft-trace] load failed", error);
    return jsonProxyResponse(
      request,
      { error: "Failed to load aircraft trace" },
      { status: Number(error?.status) || 502 },
    );
  }
}
