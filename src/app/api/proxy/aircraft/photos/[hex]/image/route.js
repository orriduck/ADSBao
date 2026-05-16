import {
  buildProxyHeaders,
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
  normalizeAircraftHex,
  readResponseJson,
} from "@/services/apiProxySecurity.js";

const rateLimit = {
  key: "proxy:aircraft-photo-image",
  maxRequests: 90,
  windowMs: 60_000,
};

const USER_AGENT = "ADSBao/0.11.0 (+https://github.com/orriduck/ADSBao)";
const PHOTO_MAX_BYTES = 256 * 1024;
const PHOTO_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
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

function selectImageUrl(payload) {
  const [photo] = Array.isArray(payload?.photos) ? payload.photos : [];
  return (
    (typeof photo?.thumbnail_large?.src === "string" &&
      photo.thumbnail_large.src) ||
    (typeof photo?.thumbnail?.src === "string" && photo.thumbnail.src) ||
    ""
  );
}

async function fetchPhotoImageUrl({ hex, request }) {
  const response = await fetch(buildPhotoUrl({ hex, request }), {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    next: { revalidate: 3600 },
  });
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  const payload = await readResponseJson(response, {
    label: `${PHOTO_SOURCE} aircraft photo response`,
    maxBytes: PHOTO_MAX_BYTES,
  });
  return selectImageUrl(payload);
}

async function fetchImage(imageUrl) {
  const response = await fetch(imageUrl, {
    headers: {
      Accept: "image/avif,image/webp,image/jpeg,image/*",
      "User-Agent": USER_AGENT,
    },
    next: { revalidate: 3600 },
  });
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > PHOTO_IMAGE_MAX_BYTES) {
    throw new Error("photo image exceeded byte limit");
  }
  const contentType = response.headers.get("content-type") || "image/jpeg";
  if (!contentType.startsWith("image/")) {
    throw new Error("photo response was not an image");
  }
  return { body: response.body, contentType };
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
    const imageUrl = await fetchPhotoImageUrl({ hex, request });
    if (!imageUrl) {
      return jsonProxyResponse(
        request,
        { error: "Aircraft photo not found" },
        { status: 404, headers: { "X-Data-Source": PHOTO_SOURCE } },
      );
    }

    const image = await fetchImage(imageUrl);
    return new Response(image.body, {
      headers: buildProxyHeaders(request, {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "Content-Type": image.contentType,
        "X-Data-Source": PHOTO_SOURCE,
      }),
    });
  } catch (error) {
    console.warn(
      "[aircraft-photo-image] planespotters.net failed",
      error.status ? `status=${error.status}` : error.message,
    );
    return jsonProxyResponse(
      request,
      { error: "Failed to load aircraft photo image" },
      {
        status: Number(error.status) || 502,
        headers: { "Cache-Control": "no-store", "X-Data-Source": "failed" },
      },
    );
  }
}
