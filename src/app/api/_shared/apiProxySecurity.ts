const DEFAULT_ALLOWED_METHODS = ["GET", "OPTIONS"];
const DEFAULT_RATE_LIMIT = {
  windowMs: 60_000,
  maxRequests: 90,
};
const DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_RATE_LIMIT_ENTRIES = 2_000;
const DEFAULT_NEW_RELIC_METRICS_ENDPOINT =
  "https://metric-api.newrelic.com/metric/v1";
const DEFAULT_NEW_RELIC_LOGS_ENDPOINT =
  "https://log-api.newrelic.com/log/v1";

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
  nowEpochMs?: number;
  logger?: (...data: unknown[]) => void;
  env?: EnvLike;
  fetcher?: typeof fetch;
};
type ResponseReadOptions = {
  label?: string;
  maxBytes?: number;
};
type ProxyObservation = {
  level: "info" | "warn" | "error";
  msg: "proxy_route_done";
  route: string;
  requestId: string | null;
  status: number;
  statusClass: string;
  result: "success" | "error";
  ms: number | null;
  source: string | null;
  attempts: string | null;
  environment: string;
  timestamp: number;
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
      env.VERCEL_URL ? `https://${env.VERCEL_URL}` : "",
      env.NEXT_PUBLIC_SITE_URL || "",
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
  nowEpochMs = Date.now(),
  logger = console.info,
  env = typeof process !== "undefined" ? process.env : {},
  fetcher = typeof fetch === "function" ? fetch : undefined,
}: LogProxyRouteResponseOptions = {}) {
  const startedAt = Number(startMs);
  const finishedAt = Number(nowMs);
  const status = Number(response?.status) || 0;
  const statusClass = status > 0 ? `${Math.floor(status / 100)}xx` : "unknown";
  const result = status > 0 && status < 400 ? "success" : "error";
  const payload: ProxyObservation = {
    level: status >= 500 || status === 0 ? "error" : status >= 400 ? "warn" : "info",
    msg: "proxy_route_done",
    route: String(route || ""),
    requestId: request?.headers?.get?.("x-vercel-id") || null,
    status,
    statusClass,
    result,
    ms:
      Number.isFinite(startedAt) && Number.isFinite(finishedAt)
        ? Math.max(0, Math.round(finishedAt - startedAt))
        : null,
    source:
      response?.headers?.get?.("x-data-source") ||
      response?.headers?.get?.("x-route-source") ||
      null,
    attempts: response?.headers?.get?.("x-provider-attempts") || null,
    environment: String(env.VERCEL_ENV || env.NODE_ENV || "production"),
    timestamp: Number.isFinite(Number(nowEpochMs)) ? Number(nowEpochMs) : Date.now(),
  };
  if (typeof logger === "function") {
    logger(JSON.stringify(toProxyConsolePayload(payload)));
  }
  await recordNewRelicProxyObservation(payload, { env, fetcher });
  return response;
}

function toProxyConsolePayload(payload: ProxyObservation) {
  return {
    level: payload.level,
    msg: payload.msg,
    route: payload.route,
    requestId: payload.requestId,
    status: payload.status,
    ms: payload.ms,
    source: payload.source,
    attempts: payload.attempts,
  };
}

async function recordNewRelicProxyObservation(
  payload: ProxyObservation,
  {
    env = typeof process !== "undefined" ? process.env : {},
    fetcher = typeof fetch === "function" ? fetch : undefined,
  }: { env?: EnvLike; fetcher?: typeof fetch } = {},
) {
  const licenseKey = String(env.NEW_RELIC_LICENSE_KEY || "").trim();
  if (!licenseKey || typeof fetcher !== "function") return;

  const metricEndpoint = String(
    env.NEW_RELIC_METRICS_ENDPOINT || DEFAULT_NEW_RELIC_METRICS_ENDPOINT,
  ).trim();
  const logsEndpoint = String(
    env.NEW_RELIC_LOGS_ENDPOINT || DEFAULT_NEW_RELIC_LOGS_ENDPOINT,
  ).trim();
  const appName = String(env.NEW_RELIC_APP_NAME || "adsbao-web").trim();
  const attributes = proxyTelemetryAttributes(payload);
  const headers = {
    "Content-Type": "application/json",
    "Api-Key": licenseKey,
  };
  const requests = [
    fetcher(metricEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify([
        {
          common: {
            timestamp: payload.timestamp,
            attributes: {
              "app.name": appName,
              "service.name": "adsbao-web",
              environment: payload.environment,
            },
          },
          metrics: proxyMetrics(payload, attributes),
        },
      ]),
    }),
    fetcher(logsEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify([
        {
          common: {
            attributes: {
              "app.name": appName,
              "service.name": "adsbao-web",
              environment: payload.environment,
              logtype: "adsbao-web",
            },
          },
          logs: [
            {
              timestamp: payload.timestamp,
              message: payload.msg,
              level: payload.level,
              attributes: {
                ...attributes,
                "request.id": payload.requestId || "unknown",
                "duration.ms": payload.ms,
              },
            },
          ],
        },
      ]),
    }),
  ];

  try {
    const responses = await Promise.all(requests);
    for (const response of responses) {
      if (!response.ok && response.status !== 202) {
        throw new Error(`New Relic ingest returned ${response.status}`);
      }
    }
  } catch (error) {
    console.warn(
      "[newrelic-proxy] ingest failed",
      error instanceof Error ? error.message : String(error),
    );
  }
}

function proxyTelemetryAttributes(payload: ProxyObservation) {
  return {
    route: payload.route || "unknown",
    source: payload.source || "unknown",
    attempts: payload.attempts || "none",
    result: payload.result,
    status: String(payload.status || "unknown"),
    "status.class": payload.statusClass,
  };
}

function proxyMetrics(
  payload: ProxyObservation,
  attributes: ReturnType<typeof proxyTelemetryAttributes>,
) {
  const metrics: Array<Record<string, unknown>> = [
    {
      name: "adsbao.vercel.proxy.requests",
      type: "count",
      value: 1,
      "interval.ms": 1000,
      attributes,
    },
  ];
  if (payload.ms != null) {
    const durationSeconds = payload.ms / 1000;
    metrics.push({
      name: "adsbao.vercel.proxy.duration.seconds",
      type: "summary",
      value: {
        count: 1,
        sum: durationSeconds,
        min: durationSeconds,
        max: durationSeconds,
      },
      "interval.ms": 1000,
      attributes,
    });
  }
  return metrics;
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
