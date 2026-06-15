const DEFAULT_ALLOWED_METHODS = ["GET", "OPTIONS"];
const DEFAULT_RATE_LIMIT = {
  windowMs: 60_000,
  maxRequests: 90,
};
const DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_RATE_LIMIT_ENTRIES = 2_000;

type EnvLike = Record<string, string | undefined>;
type CoordinateRange = { min: number; max: number };
type DistanceRange = { min?: number; max?: number };
type ProxyHeaderOptions = {
  allowedOrigins?: Set<string>;
  allowedMethods?: string[];
  env?: EnvLike;
  varyOrigin?: boolean;
};
type RateLimitOptions = {
  request: Request;
  key?: string;
  now?: number;
  windowMs?: number;
  maxRequests?: number;
};
type RateLimitBucket = {
  count: number;
  resetAt: number;
};
type EnforceProxyOptions = ProxyHeaderOptions & {
  rateLimit?: Omit<RateLimitOptions, "request">;
};
type JsonProxyInit = ResponseInit & {
  headers?: HeadersInit;
};
type LogProxyRouteResponseOptions = {
  request?: Request;
  route?: string;
  response?: Response;
  startMs?: number;
  nowMs?: number;
  logger?: (...data: unknown[]) => void;
};
type ResponseReadOptions = {
  label?: string;
  maxBytes?: number;
};
type ProxyObservation = {
  level: "info" | "warn" | "error";
  msg: "proxy_route_done";
  route: string;
  url: string;
  queryParams: string | null;
  requestId: string | null;
  status: number;
  statusClass: string;
  result: "success" | "error";
  error: string | null;
  ms: number | null;
  source: string | null;
  attempts: string | null;
};

const rateLimitBuckets = new Map<string, RateLimitBucket>();

const textDecoder = new TextDecoder();

const splitAllowedOrigins = (value: unknown) =>
  String(value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const normalizeOrigin = (value: unknown) => {
  try {
    return new URL(String(value)).origin;
  } catch {
    return "";
  }
};

function getConfiguredAllowedOrigins({
  env = typeof process !== "undefined" ? process.env : {},
}: { env?: EnvLike } = {}) {
  return new Set(
    [
      ...splitAllowedOrigins(env.ADSBAO_ALLOWED_ORIGINS),
      ...splitAllowedOrigins(env.ADSBao_ALLOWED_ORIGINS),
      env.ADSBAO_SITE_URL || "",
      env.VITE_SITE_URL || "",
    ]
      .map(normalizeOrigin)
      .filter(Boolean),
  );
}

function isCoordinateInRange(value: unknown, { min, max }: CoordinateRange) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max;
}

export function normalizeLatitude(value: unknown) {
  const number = Number(value);
  return isCoordinateInRange(number, { min: -90, max: 90 }) ? number : null;
}

export function normalizeLongitude(value: unknown) {
  const number = Number(value);
  return isCoordinateInRange(number, { min: -180, max: 180 }) ? number : null;
}

export function normalizeDistanceNm(value: unknown, { min = 1, max = 250 }: DistanceRange = {}) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

export function normalizeIcao(value: unknown) {
  const icao = String(value || "").trim().toUpperCase();
  return /^[A-Z0-9]{3,4}$/.test(icao) ? icao : "";
}

export function normalizeAircraftHex(value: unknown) {
  const hex = String(value || "").trim().toUpperCase();
  return /^(~?[0-9A-F]{6})$/.test(hex) ? hex : "";
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

function getRequestOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin ? normalizeOrigin(origin) : "";
}

function getSameOrigin(request: Request) {
  try {
    return new URL(request.url).origin;
  } catch {
    return "";
  }
}

function getAllowedRequestOrigin(request: Request, options: ProxyHeaderOptions = {}) {
  const origin = getRequestOrigin(request);
  if (!origin) return "";

  const sameOrigin = getSameOrigin(request);
  if (sameOrigin && origin === sameOrigin) return origin;

  const allowedOrigins =
    options.allowedOrigins || getConfiguredAllowedOrigins(options);
  return allowedOrigins.has(origin) ? origin : "";
}

function isCrossOriginBlocked(request: Request, options: ProxyHeaderOptions = {}) {
  return Boolean(getRequestOrigin(request) && !getAllowedRequestOrigin(request, options));
}

export function buildProxyHeaders(
  request: Request,
  headers: HeadersInit = {},
  options: ProxyHeaderOptions = {},
) {
  const output = new Headers(headers);
  const allowedOrigin = getAllowedRequestOrigin(request, options);
  if (allowedOrigin) output.set("Access-Control-Allow-Origin", allowedOrigin);
  const allowedMethods = Array.isArray(options.allowedMethods) && options.allowedMethods.length
    ? options.allowedMethods
    : DEFAULT_ALLOWED_METHODS;
  output.set("Access-Control-Allow-Methods", allowedMethods.join(", "));
  output.set("Access-Control-Allow-Headers", "Accept, Content-Type");
  output.set("Access-Control-Max-Age", "86400");
  if (options.varyOrigin !== false) {
    output.append("Vary", "Origin");
  }
  output.set("X-Content-Type-Options", "nosniff");
  return output;
}

export function createCorsPreflightResponse(request: Request, options: ProxyHeaderOptions = {}) {
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

const pruneRateLimitBuckets = (now: number) => {
  if (rateLimitBuckets.size <= MAX_RATE_LIMIT_ENTRIES) return;
  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
    if (rateLimitBuckets.size <= MAX_RATE_LIMIT_ENTRIES) return;
  }
};

function checkProxyRateLimit({
  request,
  key,
  now = Date.now(),
  windowMs = DEFAULT_RATE_LIMIT.windowMs,
  maxRequests = DEFAULT_RATE_LIMIT.maxRequests,
}: RateLimitOptions) {
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

export function enforceProxyRequest(request: Request, options: EnforceProxyOptions = {}) {
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

export function jsonProxyResponse(
  request: Request,
  body: unknown,
  init: JsonProxyInit = {},
  options: ProxyHeaderOptions = {},
) {
  return Response.json(body, {
    ...init,
    headers: buildProxyHeaders(request, init.headers || {}, options),
  });
}

export async function logProxyRouteResponse({
  request,
  route,
  response,
  startMs,
  nowMs =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now(),
  logger = console.info,
}: LogProxyRouteResponseOptions = {}) {
  const startedAt = Number(startMs);
  const finishedAt = Number(nowMs);
  const status = Number(response?.status) || 0;
  const statusClass = status > 0 ? `${Math.floor(status / 100)}xx` : "unknown";
  const result = status > 0 && status < 400 ? "success" : "error";
  const target = proxyRequestTarget(request, route);
  const payload: ProxyObservation = {
    level: status >= 500 || status === 0 ? "error" : status >= 400 ? "warn" : "info",
    msg: "proxy_route_done",
    route: String(route || ""),
    url: target.url,
    queryParams: target.queryParams,
    requestId:
      request?.headers?.get?.("x-request-id") ||
      request?.headers?.get?.("x-railway-request-id") ||
      null,
    status,
    statusClass,
    result,
    error: result === "error" ? `status=${status || "unknown"}` : null,
    ms:
      Number.isFinite(startedAt) && Number.isFinite(finishedAt)
        ? Math.max(0, Math.round(finishedAt - startedAt))
        : null,
    source:
      response?.headers?.get?.("x-data-source") ||
      response?.headers?.get?.("x-route-source") ||
      null,
    attempts: response?.headers?.get?.("x-provider-attempts") || null,
  };
  if (typeof logger === "function") {
    logger(JSON.stringify(toProxyConsolePayload(payload)));
  }
  return response;
}

function toProxyConsolePayload(payload: ProxyObservation) {
  return {
    level: payload.level,
    msg: payload.msg,
    route: payload.route,
    url: payload.url,
    queryParams: payload.queryParams,
    requestId: payload.requestId,
    status: payload.status,
    error: payload.error,
    ms: payload.ms,
    source: payload.source,
    attempts: payload.attempts,
  };
}

function proxyRequestTarget(request?: Request, route?: string) {
  const fallback = String(route || "unknown");
  if (!request?.url) {
    return { url: fallback, queryParams: null };
  }
  try {
    const parsed = new URL(request.url);
    return {
      url: parsed.pathname || fallback,
      queryParams: sanitizedQueryParams(parsed.searchParams),
    };
  } catch {
    return { url: fallback, queryParams: null };
  }
}

function sanitizedQueryParams(params: URLSearchParams) {
  const parts: string[] = [];
  params.forEach((value, key) => {
    parts.push(`${key}=${isSensitiveQueryKey(key) ? "[redacted]" : value}`);
  });
  return parts.length > 0 ? parts.join("&") : null;
}

function isSensitiveQueryKey(key: string) {
  const normalized = key.toLowerCase();
  return (
    normalized.includes("key") ||
    normalized.includes("token") ||
    normalized.includes("secret") ||
    normalized.includes("password")
  );
}

async function readResponseBytes(
  response: Response,
  {
    label = "upstream response",
    maxBytes = DEFAULT_MAX_RESPONSE_BYTES,
  }: ResponseReadOptions = {},
) {
  const contentLength = Number(response.headers?.get?.("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error(`${label} exceeded ${maxBytes} bytes`);
  }

  if (!response.body?.getReader) {
    let bytes: Uint8Array;
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
  const chunks: Uint8Array[] = [];
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

export async function readResponseText(response: Response, options: ResponseReadOptions = {}) {
  return textDecoder.decode(await readResponseBytes(response, options));
}

export async function readResponseJson(response: Response, options: ResponseReadOptions = {}) {
  const text = await readResponseText(response, options);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON from ${options.label || "upstream response"}`);
  }
}

export async function readResponseArrayBuffer(
  response: Response,
  options: ResponseReadOptions = {},
) {
  const bytes = await readResponseBytes(response, options);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
