import {
  buildProxyHeaders,
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
  logProxyRouteResponse,
  readResponseJson,
} from "@/app/api/_shared/apiProxySecurity";
import {
  buildImmersiveMapLibreStyle,
  buildLocalizedMapLibreStyle,
  buildProxiedMapLibreStyle,
  getMapLibreBaseStyleUrl,
} from "@/features/airport/map/mapTileLanguageModel";

const SOURCE = "openfreemap";
const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=86400, s-maxage=86400",
};
const rateLimit = {
  key: "proxy:map-style",
  maxRequests: 240,
  windowMs: 60_000,
};

export function OPTIONS(request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request, { params }) {
  const startedAt = performance.now();
  const securityResponse = enforceProxyRequest(request, { rateLimit });
  if (securityResponse) return securityResponse;

  const { theme: rawTheme } = await params;
  const requestUrl = new URL(request.url);
  const immersiveMode = rawTheme === "immersive";
  const baseTheme = rawTheme === "light" || immersiveMode ? "light" : "dark";
  const locale = requestUrl.searchParams.get("locale") || "en";
  const showLabels = requestUrl.searchParams.get("labels") !== "0";
  const localMinutes = requestUrl.searchParams.get("localMinutes");

  let upstreamStyle;
  try {
    upstreamStyle = await fetchJson(
      getMapLibreBaseStyleUrl(baseTheme),
      "OpenFreeMap style",
    );
  } catch (error) {
    console.warn("[map-style] upstream fetch failed", error?.message || error);
    return logProxyRouteResponse({
      request,
      route: "/api/proxy/map-style",
      response: jsonProxyResponse(
        request,
        { error: "Failed to load map style" },
        {
          status: 502,
          headers: { "Cache-Control": "no-store", "X-Data-Source": "failed" },
        },
      ),
      startMs: startedAt,
    });
  }

  const style = buildLocalizedMapLibreStyle(
    immersiveMode
      ? buildImmersiveMapLibreStyle(buildProxiedMapLibreStyle(upstreamStyle), {
          localMinutes,
        })
      : buildProxiedMapLibreStyle(upstreamStyle),
    { locale, showLabels },
  );

  return logProxyRouteResponse({
    request,
    route: "/api/proxy/map-style",
    response: Response.json(style, {
      headers: buildProxyHeaders(request, {
        ...CACHE_HEADERS,
        "X-Data-Source": SOURCE,
      }),
    }),
    startMs: startedAt,
  });
}

async function fetchJson(url, label) {
  const response = await fetch(url, { next: { revalidate: 86400 } });
  if (!response.ok) {
    throw new Error(`${label} failed with ${response.status}`);
  }
  return readResponseJson(response, { label, maxBytes: 4 * 1024 * 1024 });
}
