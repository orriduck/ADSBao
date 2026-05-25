import {
  buildProxyHeaders,
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
  readResponseJson,
} from "@/app/api/_shared/apiProxySecurity.js";
import {
  buildLocalizedMapLibreStyle,
  buildProxiedMapLibreStyle,
  getMapLibreBaseStyleUrl,
} from "@/features/airport/map/mapTileLanguageModel.js";

const OPENFREEMAP_TILEJSON_URL = "https://tiles.openfreemap.org/planet";
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
  const securityResponse = enforceProxyRequest(request, { rateLimit });
  if (securityResponse) return securityResponse;

  const { theme: rawTheme } = await params;
  const theme = rawTheme === "light" ? "light" : "dark";
  const requestUrl = new URL(request.url);
  const locale = requestUrl.searchParams.get("locale") || "en";
  const showLabels = requestUrl.searchParams.get("labels") !== "0";

  let upstreamStyle;
  let tileJson;
  try {
    [upstreamStyle, tileJson] = await Promise.all([
      fetchJson(getMapLibreBaseStyleUrl(theme), "OpenFreeMap style"),
      fetchJson(OPENFREEMAP_TILEJSON_URL, "OpenFreeMap TileJSON"),
    ]);
  } catch (error) {
    console.warn("[map-style] upstream fetch failed", error?.message || error);
    return jsonProxyResponse(
      request,
      { error: "Failed to load map style" },
      {
        status: 502,
        headers: { "Cache-Control": "no-store", "X-Data-Source": "failed" },
      },
    );
  }

  const style = buildLocalizedMapLibreStyle(
    buildProxiedMapLibreStyle(upstreamStyle, {
      proxyOrigin: requestUrl.origin,
      tileJson,
    }),
    { locale, showLabels },
  );

  return Response.json(style, {
    headers: buildProxyHeaders(request, {
      ...CACHE_HEADERS,
      "X-Data-Source": SOURCE,
    }),
  });
}

async function fetchJson(url, label) {
  const response = await fetch(url, { next: { revalidate: 86400 } });
  if (!response.ok) {
    throw new Error(`${label} failed with ${response.status}`);
  }
  return readResponseJson(response, { label, maxBytes: 4 * 1024 * 1024 });
}
