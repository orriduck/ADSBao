import {
  buildProxyHeaders,
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
  logProxyRouteResponse,
  readResponseJson,
} from "@/app/api/_shared/apiProxySecurity";
import {
  buildLocalizedMapLibreStyle,
  buildProxiedMapLibreStyle,
  buildReadableTerrainMapLibreStyle,
  getMapLibreBaseStyleUrl,
  shouldApplyReadableTerrain,
} from "@/features/airport/map/mapTileLanguageModel";
import { isKnownMapTheme } from "@/features/airport/map/airportMapModel";

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
  const baseTheme = isKnownMapTheme(rawTheme) ? rawTheme : "dark";
  const locale = requestUrl.searchParams.get("locale") || "en";
  const showLabels = requestUrl.searchParams.get("labels") !== "0";
  // Optional `baseLayer` query (standard | terrain | transport) picks
  // which OFM style to fetch. Unknown / missing → server defaults to
  // terrain so existing clients keep the previous look.
  const baseLayer = requestUrl.searchParams.get("baseLayer") || undefined;

  let upstreamStyle;
  try {
    upstreamStyle = await fetchJson(
      getMapLibreBaseStyleUrl(baseTheme, baseLayer),
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

  // Only the terrain base layer gets the readable-hillshade pass.
  // Standard / transport pass through clean so the user can actually
  // see the difference when they switch.
  const proxiedStyle = buildProxiedMapLibreStyle(upstreamStyle);
  const styleWithTerrain = shouldApplyReadableTerrain(baseLayer)
    ? buildReadableTerrainMapLibreStyle(proxiedStyle, { theme: baseTheme })
    : proxiedStyle;
  const style = buildLocalizedMapLibreStyle(styleWithTerrain, {
    locale,
    showLabels,
  });

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
