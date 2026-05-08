import {
  buildProxyHeaders,
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
  normalizeDistanceNm,
  normalizeLatitude,
  normalizeLongitude,
  readResponseJson,
} from "@/services/apiProxySecurity.js";

const rateLimit = {
  key: "proxy:aircraft-positions",
  maxRequests: 120,
  windowMs: 60_000,
};

const USER_AGENT = "ADSBao/0.9.0 (https://github.com/orriduck/ADSBao)";

export function OPTIONS(request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request, { params }) {
  const securityResponse = enforceProxyRequest(request, { rateLimit });
  if (securityResponse) return securityResponse;

  const { lat, lon, dist } = await params;
  const latitude = normalizeLatitude(lat);
  const longitude = normalizeLongitude(lon);
  const distanceNm = normalizeDistanceNm(dist, { min: 1, max: 250 });

  if (latitude == null || longitude == null || distanceNm == null) {
    return jsonProxyResponse(
      request,
      { error: "Invalid aircraft position query" },
      { status: 400 },
    );
  }

  const url = `https://api.adsb.lol/v2/lat/${encodeURIComponent(
    String(latitude),
  )}/lon/${encodeURIComponent(String(longitude))}/dist/${encodeURIComponent(
    String(distanceNm),
  )}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      next: {
        revalidate: 0,
      },
    });

    if (!response.ok) {
      return jsonProxyResponse(
        request,
        { error: "Failed to load aircraft positions" },
        { status: response.status },
      );
    }

    const payload = await readResponseJson(response, {
      label: "adsb.lol aircraft response",
      maxBytes: 2 * 1024 * 1024,
    });

    if (!payload || typeof payload !== "object" || !Array.isArray(payload.ac)) {
      return jsonProxyResponse(
        request,
        { error: "Invalid aircraft payload" },
        { status: 502 },
      );
    }

    return Response.json(payload, {
      headers: buildProxyHeaders(request, {
        "Cache-Control": "no-store",
      }),
    });
  } catch (error) {
    console.error("[aircraft-positions] load failed", error);
    return jsonProxyResponse(
      request,
      { error: "Failed to load aircraft positions" },
      { status: 502 },
    );
  }
}
