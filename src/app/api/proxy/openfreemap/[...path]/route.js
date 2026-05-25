import {
  buildProxyHeaders,
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
  readResponseArrayBuffer,
} from "@/app/api/_shared/apiProxySecurity.js";

const OPENFREEMAP_BASE_URL = "https://tiles.openfreemap.org";
const SOURCE = "openfreemap";
const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=86400, s-maxage=86400",
};
const rateLimit = {
  key: "proxy:openfreemap",
  maxRequests: 3000,
  windowMs: 60_000,
};

export function OPTIONS(request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request, { params }) {
  const securityResponse = enforceProxyRequest(request, { rateLimit });
  if (securityResponse) return securityResponse;

  const { path: rawPath } = await params;
  const path = normalizeOpenFreeMapPath(rawPath);
  if (!path) {
    return jsonProxyResponse(
      request,
      { error: "Invalid map tile path" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const upstreamUrl = new URL(`${OPENFREEMAP_BASE_URL}/${path}`);
  upstreamUrl.search = new URL(request.url).search;

  let upstream;
  try {
    upstream = await fetch(upstreamUrl, { next: { revalidate: 86400 } });
  } catch (error) {
    console.warn("[openfreemap] upstream fetch failed", error?.message || error);
    return jsonProxyResponse(
      request,
      { error: "Failed to load map tile" },
      {
        status: 502,
        headers: { "Cache-Control": "no-store", "X-Data-Source": "failed" },
      },
    );
  }

  if (!upstream.ok) {
    return jsonProxyResponse(
      request,
      { error: "Map tile not found" },
      {
        status: upstream.status === 404 ? 404 : 502,
        headers: { "Cache-Control": "public, max-age=300" },
      },
    );
  }

  const body = await readResponseArrayBuffer(upstream, {
    label: "OpenFreeMap asset",
    maxBytes: 8 * 1024 * 1024,
  });

  return new Response(body, {
    headers: buildProxyHeaders(request, {
      ...CACHE_HEADERS,
      "Content-Type":
        upstream.headers.get("content-type") || inferContentType(path),
      "X-Data-Source": SOURCE,
    }),
  });
}

function normalizeOpenFreeMapPath(pathSegments) {
  if (!Array.isArray(pathSegments) || pathSegments.length === 0) return "";
  if (pathSegments.some((segment) => !segment || segment === "." || segment === "..")) {
    return "";
  }
  return pathSegments.map((segment) => encodeURIComponent(segment)).join("/");
}

function inferContentType(path) {
  if (path.endsWith(".pbf")) return "application/x-protobuf";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".json")) return "application/json";
  return "application/octet-stream";
}
