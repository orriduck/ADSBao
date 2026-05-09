import {
  buildProxyHeaders,
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
} from "@/services/apiProxySecurity.js";
import { isKnownAircraftIconName } from "@/utils/aircraftIcon.js";

// Aircraft silhouettes are sourced from the "ADS-B Radar Free Aircraft SVG
// Icons" set published at https://adsb-radar.com/help/icons.html — see the
// resolver in src/utils/aircraftIcon.js for attribution. Serving them through
// this same-origin proxy lets us tint with `mask-image` without tripping the
// browser's cross-origin CSS resource rules.

const UPSTREAM_BASE = "https://adsb-radar.com/help/icons";
const USER_AGENT = "ADSBao/0.9.0 (https://github.com/orriduck/ADSBao)";

// Soft cap on payload size (the upstream icons are a few kB each; anything
// dramatically larger would be unexpected and we refuse it).
const MAX_BYTES = 64 * 1024;

const rateLimit = {
  key: "proxy:aircraft-icons",
  maxRequests: 240,
  windowMs: 60_000,
};

// Browser cache aggressively (the icon set is static), and let edge nodes
// keep a fresh copy for a day with stale-while-revalidate.
const CACHE_CONTROL = "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800";

export function OPTIONS(request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request, { params }) {
  const securityResponse = enforceProxyRequest(request, { rateLimit });
  if (securityResponse) return securityResponse;

  const { name } = await params;
  if (!isKnownAircraftIconName(name)) {
    return jsonProxyResponse(
      request,
      { error: "Unknown aircraft icon" },
      { status: 404 },
    );
  }

  const upstream = `${UPSTREAM_BASE}/${encodeURIComponent(name)}.svg`;

  try {
    const response = await fetch(upstream, {
      headers: {
        Accept: "image/svg+xml",
        "User-Agent": USER_AGENT,
      },
      // Allow Next.js / the platform to cache the upstream fetch for a day.
      next: { revalidate: 86_400 },
    });

    if (!response.ok) {
      return jsonProxyResponse(
        request,
        { error: "Failed to load aircraft icon" },
        { status: response.status === 404 ? 404 : 502 },
      );
    }

    const contentType =
      response.headers.get("content-type") || "image/svg+xml";
    if (!/svg/i.test(contentType)) {
      return jsonProxyResponse(
        request,
        { error: "Upstream returned a non-SVG payload" },
        { status: 502 },
      );
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) {
      return jsonProxyResponse(
        request,
        { error: "Upstream icon too large" },
        { status: 502 },
      );
    }

    return new Response(buffer, {
      status: 200,
      headers: buildProxyHeaders(request, {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": CACHE_CONTROL,
        "X-Aircraft-Icon-Name": name,
      }),
    });
  } catch (error) {
    console.error("[aircraft-icons] load failed", error);
    return jsonProxyResponse(
      request,
      { error: "Failed to load aircraft icon" },
      { status: 502 },
    );
  }
}
