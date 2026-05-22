import {
  buildProxyHeaders,
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
  readResponseArrayBuffer,
} from "@/app/api/_shared/apiProxySecurity.js";

// Pass-through proxy for airline logo PNGs. Direct hot-links to
// flightaware.com get blocked or rate-limited in the browser, so we
// fetch server-side and pipe back through our origin. Cached aggressively
// because logos rarely change.
const UPSTREAM_BASE = "https://www.flightaware.com/images/airline_logos/90p";
const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
};
const SOURCE = "flightaware";

const rateLimit = {
  key: "proxy:airline-logo",
  maxRequests: 120,
  windowMs: 60_000,
};

function normalizeAirlineCode(value) {
  const code = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (code.length < 2 || code.length > 3) return "";
  return code;
}

export function OPTIONS(request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request, { params }) {
  const securityResponse = enforceProxyRequest(request, { rateLimit });
  if (securityResponse) return securityResponse;

  const { icao: rawIcao } = await params;
  const icao = normalizeAirlineCode(rawIcao);
  if (!icao) {
    return jsonProxyResponse(
      request,
      { error: "Invalid airline code" },
      { status: 400 },
    );
  }

  let upstream;
  try {
    upstream = await fetch(`${UPSTREAM_BASE}/${icao}.png`, {
      headers: {
        // Identify as a regular browser so the CDN serves the image
        // rather than a hot-link block page.
        "User-Agent":
          "Mozilla/5.0 (compatible; ADSBao/1.0; +https://adsbao.com)",
        Accept: "image/png,image/*",
      },
      // Next.js fetch dedupe + cache so we don't hammer the CDN.
      next: { revalidate: 604800 },
    });
  } catch (error) {
    console.warn("[airline-logo] upstream fetch failed", error?.message || error);
    return jsonProxyResponse(
      request,
      { error: "Failed to load airline logo" },
      {
        status: 502,
        headers: { "Cache-Control": "no-store", "X-Data-Source": "failed" },
      },
    );
  }

  if (!upstream.ok) {
    return jsonProxyResponse(
      request,
      { error: "Airline logo not found" },
      {
        status: upstream.status === 404 ? 404 : 502,
        headers: {
          "Cache-Control": "public, max-age=3600",
          "X-Data-Source": SOURCE,
        },
      },
    );
  }

  const body = await readResponseArrayBuffer(upstream);
  return new Response(body, {
    headers: buildProxyHeaders(request, {
      ...CACHE_HEADERS,
      "Content-Type": upstream.headers.get("content-type") || "image/png",
      "X-Data-Source": SOURCE,
    }),
  });
}
