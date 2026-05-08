const DEFAULT_ALLOWED_METHODS = ["GET", "OPTIONS"];
const DEFAULT_RATE_LIMIT = {
  windowMs: 60_000,
  maxRequests: 90,
};
const DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_RATE_LIMIT_ENTRIES = 2_000;

const rateLimitBuckets = new Map();

const textDecoder = new TextDecoder();

const splitAllowedOrigins = (value) =>
  String(value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const normalizeOrigin = (value) => {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
};

export function getConfiguredAllowedOrigins({
  env = typeof process !== "undefined" ? process.env : {},
} = {}) {
  return new Set(
    [
      ...splitAllowedOrigins(env.ADSBAO_ALLOWED_ORIGINS),
      ...splitAllowedOrigins(env.ADSBao_ALLOWED_ORIGINS),
      env.VERCEL_URL ? `https://${env.VERCEL_URL}` : "",
      env.NEXT_PUBLIC_SITE_URL || "",
    ]
      .map(normalizeOrigin)
      .filter(Boolean),
  );
}

export function isCoordinateInRange(value, { min, max }) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max;
}

export function normalizeLatitude(value) {
  const number = Number(value);
  return isCoordinateInRange(number, { min: -90, max: 90 }) ? number : null;
}

export function normalizeLongitude(value) {
  const number = Number(value);
  return isCoordinateInRange(number, { min: -180, max: 180 }) ? number : null;
}

export function normalizeDistanceNm(value, { min = 1, max = 250 } = {}) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

export function normalizeIcao(value) {
  const icao = String(value || "").trim().toUpperCase();
  return /^[A-Z0-9]{3,4}$/.test(icao) ? icao : "";
}

export function getClientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

export function getRequestOrigin(request) {
  const origin = request.headers.get("origin");
  return origin ? normalizeOrigin(origin) : "";
}

export function getSameOrigin(request) {
  try {
    return new URL(request.url).origin;
  } catch {
    return "";
  }
}

export function getAllowedRequestOrigin(request, options = {}) {
  const origin = getRequestOrigin(request);
  if (!origin) return "";

  const sameOrigin = getSameOrigin(request);
  if (sameOrigin && origin === sameOrigin) return origin;

  const allowedOrigins =
    options.allowedOrigins || getConfiguredAllowedOrigins(options);
  return allowedOrigins.has(origin) ? origin : "";
}

export function isCrossOriginBlocked(request, options = {}) {
  return Boolean(getRequestOrigin(request) && !getAllowedRequestOrigin(request, options));
}

export function buildProxyHeaders(request, headers = {}, options = {}) {
  const output = new Headers(headers);
  const allowedOrigin = getAllowedRequestOrigin(request, options);
  if (allowedOrigin) output.set("Access-Control-Allow-Origin", allowedOrigin);
  output.set("Access-Control-Allow-Methods", DEFAULT_ALLOWED_METHODS.join(", "));
  output.set("Access-Control-Allow-Headers", "Accept, Content-Type");
  output.set("Access-Control-Max-Age", "86400");
  output.append("Vary", "Origin");
  output.set("X-Content-Type-Options", "nosniff");
  return output;
}

export function createCorsPreflightResponse(request, options = {}) {
  if (isCrossOriginBlocked(request, options)) {
    return new Response(null, {
      status: 403,
      headers: buildProxyHeaders(request, {}, options),
    });
  }

  return new Response(null, {
    status: 204,
    headers: buildProxyHeaders(request, {}, options),
  });
}

const pruneRateLimitBuckets = (now) => {
  if (rateLimitBuckets.size <= MAX_RATE_LIMIT_ENTRIES) return;
  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
    if (rateLimitBuckets.size <= MAX_RATE_LIMIT_ENTRIES) return;
  }
};

export function checkProxyRateLimit({
  request,
  key,
  now = Date.now(),
  windowMs = DEFAULT_RATE_LIMIT.windowMs,
  maxRequests = DEFAULT_RATE_LIMIT.maxRequests,
} = {}) {
  const bucketKey = `${key || "proxy"}:${getClientIp(request)}`;
  const bucket = rateLimitBuckets.get(bucketKey);
  pruneRateLimitBuckets(now);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(bucketKey, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { allowed: true, remaining: maxRequests - 1, retryAfter: 0 };
  }

  if (bucket.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: maxRequests - bucket.count,
    retryAfter: 0,
  };
}

export function enforceProxyRequest(request, options = {}) {
  if (isCrossOriginBlocked(request, options)) {
    return Response.json(
      { error: "Origin is not allowed" },
      { status: 403, headers: buildProxyHeaders(request, {}, options) },
    );
  }

  const rateLimit = checkProxyRateLimit({ request, ...options.rateLimit });
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: buildProxyHeaders(
          request,
          { "Retry-After": String(rateLimit.retryAfter) },
          options,
        ),
      },
    );
  }

  return null;
}

export function jsonProxyResponse(request, body, init = {}, options = {}) {
  return Response.json(body, {
    ...init,
    headers: buildProxyHeaders(request, init.headers || {}, options),
  });
}

async function readResponseBytes(
  response,
  {
    label = "upstream response",
    maxBytes = DEFAULT_MAX_RESPONSE_BYTES,
  } = {},
) {
  const contentLength = Number(response.headers?.get?.("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error(`${label} exceeded ${maxBytes} bytes`);
  }

  if (!response.body?.getReader) {
    let bytes;
    if (typeof response.arrayBuffer === "function") {
      bytes = new Uint8Array(await response.arrayBuffer());
    } else if (typeof response.text === "function") {
      bytes = new TextEncoder().encode(await response.text());
    } else if (typeof response.json === "function") {
      bytes = new TextEncoder().encode(JSON.stringify(await response.json()));
    } else {
      throw new Error(`${label} could not be read`);
    }
    if (bytes.byteLength > maxBytes) {
      throw new Error(`${label} exceeded ${maxBytes} bytes`);
    }
    return bytes;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new Error(`${label} exceeded ${maxBytes} bytes`);
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function readResponseText(response, options = {}) {
  return textDecoder.decode(await readResponseBytes(response, options));
}

export async function readResponseJson(response, options = {}) {
  const text = await readResponseText(response, options);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON from ${options.label || "upstream response"}`);
  }
}

export async function readResponseArrayBuffer(response, options = {}) {
  const bytes = await readResponseBytes(response, options);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export function __resetProxySecurityForTests() {
  rateLimitBuckets.clear();
}
