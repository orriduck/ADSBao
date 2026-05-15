import {
  buildProxyHeaders,
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
  normalizeAircraftHex,
  readResponseJson,
} from "@/services/apiProxySecurity.js";
import { TRACE_PROVIDER_CHAIN } from "@/services/aviation/aircraftDataProviders.js";

const rateLimit = {
  key: "proxy:aircraft-trace",
  maxRequests: 60,
  windowMs: 60_000,
};

const USER_AGENT = "ADSBao/0.11.0 (https://github.com/orriduck/ADSBao)";
const TRACE_MAX_BYTES = 6 * 1024 * 1024;

// Trace data is only published by adsb.lol; airplanes.live exposes no
// equivalent endpoint. There's nothing to fail over to, so this route
// just calls the single provider and returns whatever it gets.
const [TRACE_PROVIDER] = TRACE_PROVIDER_CHAIN;

export function OPTIONS(request) {
  return createCorsPreflightResponse(request);
}

async function fetchTrace({ hex }) {
  const url = TRACE_PROVIDER.buildTraceUrl({ hex });

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
    throw error;
  }

  if (response.status === 404) return null;
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  try {
    return await readResponseJson(response, {
      label: `${TRACE_PROVIDER.id} aircraft trace response`,
      maxBytes: TRACE_MAX_BYTES,
    });
  } catch (parseError) {
    throw new Error(`parse: ${parseError.message}`);
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

  const attempts = [];
  try {
    const recent = await fetchTrace({ hex });
    if (!recent) {
      attempts.push(`${TRACE_PROVIDER.id}:404`);
      return jsonProxyResponse(
        request,
        { error: "Aircraft trace not found" },
        {
          status: 404,
          headers: {
            "X-Data-Source": TRACE_PROVIDER.id,
            "X-Provider-Attempts": attempts.join(";"),
          },
        },
      );
    }
    attempts.push(`${TRACE_PROVIDER.id}:200`);
    return Response.json(
      { hex, recent, source: TRACE_PROVIDER.id },
      {
        headers: buildProxyHeaders(request, {
          "Cache-Control": "no-store",
          "X-Data-Source": TRACE_PROVIDER.id,
          "X-Provider-Attempts": attempts.join(";"),
        }),
      },
    );
  } catch (error) {
    attempts.push(`${TRACE_PROVIDER.id}:${error.status || "ERR"}`);
    console.warn(
      `[aircraft-trace] ${TRACE_PROVIDER.id} failed`,
      error.status ? `status=${error.status}` : error.message,
    );
    return jsonProxyResponse(
      request,
      { error: "Failed to load aircraft trace" },
      {
        status: Number(error.status) || 502,
        headers: {
          "X-Data-Source": "failed",
          "X-Provider-Attempts": attempts.join(";") || "none",
        },
      },
    );
  }
}
