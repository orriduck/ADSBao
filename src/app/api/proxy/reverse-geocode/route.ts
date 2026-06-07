import {
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
  normalizeLatitude,
  normalizeLongitude,
} from "@/app/api/_shared/apiProxySecurity";

// Same-origin proxy in front of Nominatim's `/reverse` endpoint so
// the near-me explorer can resolve "what city am I in" without
// adding nominatim.openstreetmap.org to the global CSP `connect-src`
// list. We also identify ourselves with a proper User-Agent (Nominatim
// rejects requests without one for sustained use) and apply a tight
// rate limit on the proxy so a single tab can't hammer the upstream.

const rateLimit = {
  key: "proxy:reverse-geocode",
  maxRequests: 30,
  windowMs: 60_000,
};

// Nominatim's usage policy asks every client to identify itself.
// Vercel functions don't expose the deployment URL synchronously here,
// so we fall back to a stable label. Override via NEXT_PUBLIC_SITE_URL
// when present.
const USER_AGENT = `ADSBao/1.0 (${process.env.NEXT_PUBLIC_SITE_URL || "https://adsbao.dev"})`;

// 30 minutes shared cache + 30 minutes stale-while-revalidate. Cities
// don't move; Nominatim asks clients to cache aggressively.
const CACHE_HEADERS = {
  "Cache-Control":
    "public, max-age=1800, s-maxage=1800, stale-while-revalidate=1800",
};

export const runtime = "nodejs";

export function OPTIONS(request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request) {
  const securityResponse = enforceProxyRequest(request, { rateLimit });
  if (securityResponse) return securityResponse;

  const url = new URL(request.url);
  const lat = normalizeLatitude(url.searchParams.get("lat"));
  const lon = normalizeLongitude(url.searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return jsonProxyResponse(
      request,
      { error: "lat and lon query parameters are required" },
      { status: 400 },
    );
  }

  const language = sanitizeAcceptLanguage(
    url.searchParams.get("language") || "en",
  );
  const upstream = new URL("https://nominatim.openstreetmap.org/reverse");
  upstream.searchParams.set("lat", String(lat));
  upstream.searchParams.set("lon", String(lon));
  upstream.searchParams.set("format", "json");
  // zoom=10 returns city / town granularity — the right altitude for
  // a hero copy: "Boston" / "Massachusetts" / "United States".
  upstream.searchParams.set("zoom", "10");
  upstream.searchParams.set("accept-language", language);

  try {
    const response = await fetch(upstream, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    if (!response.ok) {
      return jsonProxyResponse(
        request,
        { error: `Upstream HTTP ${response.status}` },
        { status: 502 },
      );
    }
    const json = await response.json();
    return jsonProxyResponse(request, json, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error("[reverse-geocode] Nominatim request failed", error);
    return jsonProxyResponse(
      request,
      { error: "Failed to reverse-geocode" },
      { status: 502 },
    );
  }
}

// `accept-language` should look like `zh-CN,en` or `en` — strip anything
// outside the standard locale tag character set so we don't pass user
// input straight through to the upstream.
function sanitizeAcceptLanguage(raw: string) {
  return String(raw || "")
    .trim()
    .slice(0, 60)
    .replace(/[^A-Za-z0-9,\-_]/g, "")
    .toLowerCase() || "en";
}
