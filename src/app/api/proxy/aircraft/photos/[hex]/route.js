import {
  buildProxyHeaders,
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
  normalizeAircraftHex,
  readResponseJson,
} from "@/services/apiProxySecurity.js";

const rateLimit = {
  key: "proxy:aircraft-photos",
  maxRequests: 90,
  windowMs: 60_000,
};

const USER_AGENT = "ADSBao/0.11.0 (+https://github.com/orriduck/ADSBao)";
const PHOTO_MAX_BYTES = 256 * 1024;
const PHOTO_SOURCE = "planespotters.net";

export function OPTIONS(request) {
  return createCorsPreflightResponse(request);
}

function sanitizeOptionalCode(value, { max = 16 } = {}) {
  const normalized = String(value || "").trim().toUpperCase();
  return /^[A-Z0-9-]+$/.test(normalized) && normalized.length <= max
    ? normalized
    : "";
}

function buildPhotoUrl({ hex, request }) {
  const requestUrl = new URL(request.url);
  const url = new URL(
    `https://api.planespotters.net/pub/photos/hex/${encodeURIComponent(hex)}`,
  );
  const registration = sanitizeOptionalCode(
    requestUrl.searchParams.get("registration"),
    { max: 12 },
  );
  const type = sanitizeOptionalCode(requestUrl.searchParams.get("type"), {
    max: 8,
  });

  if (registration) url.searchParams.set("reg", registration);
  if (type) url.searchParams.set("icaoType", type);
  return url;
}

function buildImageProxyUrl({ hex, request }) {
  const requestUrl = new URL(request.url);
  const url = new URL(
    `/api/proxy/aircraft/photos/${encodeURIComponent(hex)}/image`,
    requestUrl.origin,
  );
  for (const key of ["registration", "type"]) {
    const value = requestUrl.searchParams.get(key);
    if (value) url.searchParams.set(key, value);
  }
  return `${url.pathname}${url.search}`;
}

function selectPhoto(payload) {
  const [photo] = Array.isArray(payload?.photos) ? payload.photos : [];
  const image = photo?.thumbnail_large || photo?.thumbnail;
  const src = typeof image?.src === "string" ? image.src : "";
  if (!src) return null;

  return {
    src: buildImageProxyUrl({ hex: payload?.hex, request: payload?.request }),
    originalSrc: src,
    width: Number(image?.size?.width) || null,
    height: Number(image?.size?.height) || null,
    link: typeof photo?.link === "string" ? photo.link : "",
    photographer:
      typeof photo?.photographer === "string" ? photo.photographer : "",
    source: PHOTO_SOURCE,
  };
}

async function fetchAircraftPhoto({ hex, request }) {
  const url = buildPhotoUrl({ hex, request });

  let response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      next: { revalidate: 3600 },
    });
  } catch (networkError) {
    const error = new Error(`network: ${networkError.message}`);
    throw error;
  }

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const payload = await readResponseJson(response, {
    label: `${PHOTO_SOURCE} aircraft photo response`,
    maxBytes: PHOTO_MAX_BYTES,
  });
  return selectPhoto({ ...payload, hex, request });
}

export async function GET(request, { params }) {
  const securityResponse = enforceProxyRequest(request, { rateLimit });
  if (securityResponse) return securityResponse;

  const { hex: rawHex } = await params;
  const hex = normalizeAircraftHex(rawHex);
  if (!hex) {
    return jsonProxyResponse(
      request,
      { error: "Invalid aircraft photo query" },
      { status: 400 },
    );
  }

  try {
    const photo = await fetchAircraftPhoto({ hex, request });
    if (!photo) {
      return jsonProxyResponse(
        request,
        { error: "Aircraft photo not found" },
        {
          status: 404,
          headers: {
            "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
            "X-Data-Source": PHOTO_SOURCE,
          },
        },
      );
    }

    return Response.json(
      { hex, photo },
      {
        headers: buildProxyHeaders(request, {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
          "X-Data-Source": PHOTO_SOURCE,
        }),
      },
    );
  } catch (error) {
    console.warn(
      "[aircraft-photo] planespotters.net failed",
      error.status ? `status=${error.status}` : error.message,
    );
    return jsonProxyResponse(
      request,
      { error: "Failed to load aircraft photo" },
      {
        status: Number(error.status) || 502,
        headers: {
          "Cache-Control": "no-store",
          "X-Data-Source": "failed",
        },
      },
    );
  }
}
