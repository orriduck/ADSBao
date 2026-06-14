import type { DataServiceMetricsSink } from "../types.js";

const FLIGHTAWARE_FALLBACK_BASE = "https://www.flightaware.com/live/flight";
const FLIGHTAWARE_TRACKPOLL_PATH = "/ajax/trackpoll.rvt";
const FLIGHTAWARE_FALLBACK_CACHE_TTL_MS = 60_000;
const FLIGHTAWARE_FALLBACK_TIMEOUT_MS = 7_000;
const FLIGHTAWARE_FALLBACK_USER_AGENT =
  "ADSBao data-service/1.0 (+https://adsbao.dev; flightaware/fallback)";
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

type FlightAwareRecord = Record<string, any>;
type FlightAwareFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type FlightAwareFallbackResult = {
  ok: boolean;
  hasPosition: boolean;
  errorType?: string;
  message?: string;
  upstreamStatus?: number;
  fetchedAt?: string;
  metadata?: FlightAwareRecord;
  position?: FlightAwareRecord;
};

type FlightAwareFallbackCacheEntry = {
  result: FlightAwareFallbackResult;
  expiresAt: number;
};

type FlightAwareFallbackOptions = {
  cacheStore?: Map<string, FlightAwareFallbackCacheEntry>;
  env?: Record<string, string | undefined>;
  fetchImpl?: FlightAwareFetch;
  metrics?: DataServiceMetricsSink;
  now?: () => number;
  timeoutMs?: number;
};

const cache = new Map<string, FlightAwareFallbackCacheEntry>();
const requestTimes: number[] = [];

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function normalizeCallsign(value: unknown) {
  const callsign = cleanString(value).toUpperCase().replace(/\s+/g, "");
  return /^[A-Z][A-Z0-9]{2,7}$/.test(callsign) ? callsign : "";
}

function toNumber(value: unknown) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function htmlDecode(value: unknown) {
  return cleanString(value)
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function escapeRegExp(value: unknown) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractMetaContent(html: unknown, key: string) {
  const escaped = escapeRegExp(key);
  const patterns = [
    new RegExp(
      `<meta\\b(?=[^>]*(?:name|property)=["']${escaped}["'])(?=[^>]*content=["']([^"']*)["'])[^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta\\b(?=[^>]*content=["']([^"']*)["'])(?=[^>]*(?:name|property)=["']${escaped}["'])[^>]*>`,
      "i",
    ),
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(String(html || ""));
    if (match?.[1]) return htmlDecode(match[1]);
  }
  return "";
}

function extractAssignedJson(html: unknown, name: string) {
  const source = String(html || "");
  const marker = `var ${name} =`;
  const start = source.indexOf(marker);
  if (start < 0) return null;
  const objectStart = source.indexOf("{", start + marker.length);
  if (objectStart < 0) return null;

  let depth = 0;
  let escaped = false;
  let inString = false;
  for (let index = objectStart; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(objectStart, index + 1);
    }
  }
  return null;
}

function parseAssignedJson(html: unknown, name: string) {
  const jsonText = extractAssignedJson(html, name);
  if (!jsonText) return null;
  try {
    return JSON.parse(jsonText) as FlightAwareRecord;
  } catch {
    return null;
  }
}

function extractTrackpollToken(html: unknown) {
  const globals = parseAssignedJson(html, "trackpollGlobals");
  return cleanString(globals?.TOKEN);
}

function readCoord(value: unknown) {
  if (!Array.isArray(value) || value.length < 2) return null;
  const lon = toNumber(value[0]);
  const lat = toNumber(value[1]);
  if (
    lat == null ||
    lon == null ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return null;
  }
  return { lat, lon };
}

function altitudeFt(value: unknown) {
  const number = toNumber(value);
  if (number == null) return undefined;
  return Math.abs(number) < 1000 ? Math.round(number * 100) : Math.round(number);
}

function timestampIso(value: unknown) {
  const number = toNumber(value);
  if (number == null) return undefined;
  const ms = number < 10_000_000_000 ? number * 1000 : number;
  return new Date(ms).toISOString();
}

function errorResult(
  errorType: string,
  {
    fetchedAt,
    message = "",
    upstreamStatus,
  }: {
    fetchedAt?: string;
    message?: string;
    upstreamStatus?: number;
  } = {},
): FlightAwareFallbackResult {
  return {
    ok: false,
    hasPosition: false,
    errorType,
    message,
    upstreamStatus,
    fetchedAt: fetchedAt || new Date().toISOString(),
  };
}

function cacheResult(
  cacheStore: Map<string, FlightAwareFallbackCacheEntry>,
  callsign: string,
  result: FlightAwareFallbackResult,
  nowMs: number,
) {
  cacheStore.set(callsign, {
    result,
    expiresAt: nowMs + FLIGHTAWARE_FALLBACK_CACHE_TTL_MS,
  });
}

function selectBestFlight(flights: unknown) {
  const list = Object.values((flights || {}) as Record<string, unknown>).filter(
    (flight) => flight && typeof flight === "object",
  ) as FlightAwareRecord[];
  if (list.length === 0) return null;

  return (
    list
      .map((flight, index) => {
        const hasPosition =
          Boolean(readCoord(flight.coord)) ||
          (Array.isArray(flight.track) &&
            flight.track.some((point: FlightAwareRecord) => readCoord(point?.coord)));
        const hasEnded =
          flight?.landingTimes?.actual != null ||
          flight?.gateArrivalTimes?.actual != null ||
          flight?.cancelled ||
          flight?.resultUnknown;
        const hasStarted =
          flight?.takeoffTimes?.actual != null ||
          flight?.gateDepartureTimes?.actual != null ||
          hasPosition;
        const timestamp = toNumber(flight.timestamp) || 0;
        const score =
          (hasPosition ? 10_000 : 0) +
          (hasStarted ? 1_000 : 0) -
          (hasEnded ? 2_000 : 0) -
          (flight.historical ? 100 : 0) +
          Math.min(timestamp / 1_000_000_000, 100);
        return { flight, index, score };
      })
      .sort((a, b) => b.score - a.score || a.index - b.index)[0]?.flight || null
  );
}

function selectPositionPoint(
  flight: FlightAwareRecord | null | undefined,
): FlightAwareRecord | null {
  const topLevel = readCoord(flight?.coord);
  if (topLevel) {
    return {
      ...topLevel,
      alt: flight?.altitude,
      gs: flight?.groundspeed,
      heading: flight?.heading,
      timestamp: flight?.timestamp,
      type: flight?.updateType,
    };
  }

  if (!Array.isArray(flight?.track)) return null;
  return (
    flight.track
      .filter((point: FlightAwareRecord) => readCoord(point?.coord))
      .map((point: FlightAwareRecord) => ({
        ...point,
        ...(readCoord(point.coord) as { lat: number; lon: number }),
      }))
      .sort(
        (a: FlightAwareRecord, b: FlightAwareRecord) =>
          (toNumber(b.timestamp) || 0) - (toNumber(a.timestamp) || 0),
      )[0] || null
  );
}

function normalizePositionKind({
  flight,
  point,
}: {
  flight?: FlightAwareRecord | null;
  point?: FlightAwareRecord | null;
}) {
  const label = cleanString(flight?.updateType || point?.type);
  if (/pred|tp/i.test(label)) return "predicted";
  if (/interp/i.test(label)) return "interpolated";
  if (/est|tentative/i.test(label)) return "estimated";
  return "observed";
}

function isTerminalFlight(flight: FlightAwareRecord | null | undefined, status = "") {
  if (!flight || typeof flight !== "object") return false;
  if (
    flight?.landingTimes?.actual != null ||
    flight?.gateArrivalTimes?.actual != null ||
    flight?.cancelled ||
    flight?.resultUnknown
  ) {
    return true;
  }
  return /\b(arrived|landed|cancelled|canceled|diverted|result unknown)\b/i.test(
    status,
  );
}

function buildFlightAwareFallbackUrl(callsign: unknown) {
  const normalized = normalizeCallsign(callsign);
  if (!normalized) return "";
  return `${FLIGHTAWARE_FALLBACK_BASE}/${encodeURIComponent(normalized)}`;
}

function buildFlightAwareTrackpollUrl(pageUrl: string, token: string) {
  const url = new URL(FLIGHTAWARE_TRACKPOLL_PATH, FLIGHTAWARE_FALLBACK_BASE);
  try {
    const page = new URL(pageUrl);
    page.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
  } catch {
    // Keep the plain trackpoll endpoint if the source URL is malformed.
  }
  url.searchParams.set("token", token);
  url.searchParams.set("locale", "en_US");
  url.searchParams.set("summary", "0");
  return url.toString();
}

async function readResponseText(response: Response, maxBytes = MAX_RESPONSE_BYTES) {
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    throw new Error("FlightAware response too large");
  }
  return text;
}

function buildMetadata({
  callsign,
  fetchedAt,
  flight,
  html,
}: {
  callsign: string;
  fetchedAt: string;
  flight: FlightAwareRecord;
  html: unknown;
}) {
  const origin =
    cleanString(flight?.origin?.icao) || cleanString(extractMetaContent(html, "origin"));
  const destination =
    cleanString(flight?.destination?.icao) ||
    cleanString(extractMetaContent(html, "destination"));
  const route = cleanString(flight?.flightPlan?.route);
  const planSpeed = toNumber(flight?.flightPlan?.speed);
  const planAltitude = altitudeFt(flight?.flightPlan?.altitude);
  const sourceUpdatedAt = timestampIso(flight?.timestamp);
  const status = cleanString(flight?.flightStatus) || undefined;
  const terminal = isTerminalFlight(flight, status);

  return {
    callsign,
    flightAwareUrl: buildFlightAwareFallbackUrl(callsign),
    origin: origin || undefined,
    destination: destination || undefined,
    route: route || undefined,
    altitudeFt: altitudeFt(flight?.altitude) ?? planAltitude,
    groundSpeedKt: toNumber(flight?.groundspeed) ?? planSpeed ?? undefined,
    trackDeg: toNumber(flight?.heading) ?? undefined,
    status,
    terminal,
    sourceUpdatedAt,
    fetchedAt,
    notes: ["flightaware-public-page"],
  };
}

function parseFlightAwarePayload({
  callsign,
  fetchedAt,
  html = "",
  payload,
}: {
  callsign?: unknown;
  fetchedAt?: string;
  html?: unknown;
  payload?: FlightAwareRecord | null;
} = {}): FlightAwareFallbackResult {
  const normalizedCallsign = normalizeCallsign(callsign);
  const fetched = fetchedAt || new Date().toISOString();
  if (!normalizedCallsign) return errorResult("invalid_callsign", { fetchedAt: fetched });

  const flight = selectBestFlight(payload?.flights);
  if (!flight) {
    return errorResult("parse_failed", {
      fetchedAt: fetched,
      message: "No flight entries found",
    });
  }

  const metadata = buildMetadata({
    callsign: normalizedCallsign,
    fetchedAt: fetched,
    flight,
    html,
  });
  const point = selectPositionPoint(flight);
  if (!point) {
    return {
      ok: true,
      hasPosition: false,
      fetchedAt: fetched,
      metadata,
    };
  }

  const kind = normalizePositionKind({ flight, point });
  const sourceUpdatedAt = timestampIso(point.timestamp) || metadata.sourceUpdatedAt;
  return {
    ok: true,
    hasPosition: true,
    fetchedAt: fetched,
    metadata,
    position: {
      lat: point.lat,
      lon: point.lon,
      flight_position_source: "flightaware",
      altitudeFt: altitudeFt(point.alt),
      groundSpeedKt: toNumber(point.gs) ?? metadata.groundSpeedKt,
      trackDeg: toNumber(point.heading) ?? metadata.trackDeg,
      headingDeg: toNumber(point.heading) ?? undefined,
      callsign: normalizedCallsign,
      hex: cleanString(flight?.hexid) || undefined,
      flightAwareUrl: metadata.flightAwareUrl,
      origin: metadata.origin,
      destination: metadata.destination,
      route: metadata.route,
      status: metadata.status,
      terminal: metadata.terminal,
      quality: {
        source: "flightaware",
        flight_position_source: "flightaware",
        kind,
        isEstimated: kind !== "observed",
        isPredicted: kind === "predicted",
        isInterpolated: kind === "interpolated",
        sourceLabel: "FlightAware",
        sourceUpdatedAt,
        fetchedAt: fetched,
        confidence: kind === "observed" ? "medium" : "low",
        status: metadata.status,
        terminal: metadata.terminal,
        notes: ["flightaware-public-page"],
      },
    },
  };
}

function parseFlightAwareFallbackPage({
  callsign,
  fetchedAt,
  html,
}: {
  callsign?: unknown;
  fetchedAt?: string;
  html?: unknown;
}) {
  const jsonText = extractAssignedJson(html, "trackpollBootstrap");
  if (!jsonText) {
    return errorResult("parse_failed", {
      fetchedAt,
      message: "trackpollBootstrap not found",
    });
  }
  try {
    return parseFlightAwarePayload({
      callsign,
      fetchedAt,
      html,
      payload: JSON.parse(jsonText) as FlightAwareRecord,
    });
  } catch (error) {
    return errorResult("parse_failed", {
      fetchedAt,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function parseFlightAwareTrackpollResponse({
  callsign,
  fetchedAt,
  html,
  text,
}: {
  callsign?: unknown;
  fetchedAt?: string;
  html?: unknown;
  text?: unknown;
}) {
  try {
    return parseFlightAwarePayload({
      callsign,
      fetchedAt,
      html,
      payload: JSON.parse(String(text || "")) as FlightAwareRecord,
    });
  } catch (error) {
    return errorResult("parse_failed", {
      fetchedAt,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function checkRateLimit(
  nowMs: number,
  { maxRequests = 20, windowMs = 60_000 } = {},
) {
  while (requestTimes.length && nowMs - requestTimes[0] > windowMs) {
    requestTimes.shift();
  }
  if (requestTimes.length >= maxRequests) return false;
  requestTimes.push(nowMs);
  return true;
}

function isFlightAwareFallbackEnabled(env: Record<string, string | undefined>) {
  return String(env.FLIGHTAWARE_FALLBACK_ENABLED || "true").toLowerCase() !== "false";
}

function recordExternalRequest({
  durationMs,
  metrics,
  result,
  status,
}: {
  durationMs: number;
  metrics?: DataServiceMetricsSink;
  result: "success" | "error";
  status?: number | string | null;
}) {
  metrics?.recordExternalRequest({
    provider: "flightaware",
    endpoint: "callsign",
    result,
    status,
    durationMs,
  });
}

export async function getFlightAwareFallbackByCallsign(
  callsign: unknown,
  {
    cacheStore = cache,
    env = process.env,
    fetchImpl = globalThis.fetch?.bind(globalThis),
    metrics,
    now = Date.now,
    timeoutMs = FLIGHTAWARE_FALLBACK_TIMEOUT_MS,
  }: FlightAwareFallbackOptions = {},
): Promise<FlightAwareFallbackResult> {
  const nowMs = now();
  const fetchedAt = new Date(nowMs).toISOString();
  if (!isFlightAwareFallbackEnabled(env)) {
    return errorResult("feature_disabled", { fetchedAt });
  }

  const normalizedCallsign = normalizeCallsign(callsign);
  const url = buildFlightAwareFallbackUrl(normalizedCallsign);
  if (!normalizedCallsign || !url) return errorResult("invalid_callsign", { fetchedAt });
  if (!fetchImpl) {
    return errorResult("network_failed", {
      fetchedAt,
      message: "fetch unavailable",
    });
  }

  const cached = cacheStore.get(normalizedCallsign);
  if (cached && cached.expiresAt > nowMs) return cached.result;
  if (!checkRateLimit(nowMs)) return errorResult("rate_limited", { fetchedAt });

  const pageStartedAt = Date.now();
  try {
    const response = await fetchImpl(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": FLIGHTAWARE_FALLBACK_USER_AGENT,
      },
      signal:
        typeof AbortSignal !== "undefined" && AbortSignal.timeout
          ? AbortSignal.timeout(timeoutMs)
          : undefined,
    });
    recordExternalRequest({
      durationMs: Date.now() - pageStartedAt,
      metrics,
      result: response.ok ? "success" : "error",
      status: response.status,
    });

    if (response.status === 404) return errorResult("not_found", { fetchedAt });
    if (response.status === 429) return errorResult("rate_limited", { fetchedAt });
    if (response.status === 402) {
      const result = errorResult("payment_required", {
        fetchedAt,
        message: "HTTP 402",
        upstreamStatus: 402,
      });
      cacheResult(cacheStore, normalizedCallsign, result, nowMs);
      return result;
    }
    if (!response.ok) {
      return errorResult("network_failed", {
        fetchedAt,
        message: `HTTP ${response.status}`,
        upstreamStatus: response.status,
      });
    }

    const html = await readResponseText(response);
    const trackpollToken = extractTrackpollToken(html);
    if (trackpollToken) {
      const trackpollStartedAt = Date.now();
      try {
        const trackpollResponse = await fetchImpl(
          buildFlightAwareTrackpollUrl(url, trackpollToken),
          {
            headers: {
              Accept: "application/json, text/javascript, */*; q=0.01",
              Referer: url,
              "User-Agent": FLIGHTAWARE_FALLBACK_USER_AGENT,
              "X-Requested-With": "XMLHttpRequest",
            },
            signal:
              typeof AbortSignal !== "undefined" && AbortSignal.timeout
                ? AbortSignal.timeout(timeoutMs)
                : undefined,
          },
        );
        recordExternalRequest({
          durationMs: Date.now() - trackpollStartedAt,
          metrics,
          result: trackpollResponse.ok ? "success" : "error",
          status: trackpollResponse.status,
        });
        if (trackpollResponse.ok) {
          const text = await readResponseText(trackpollResponse);
          const trackpollResult = parseFlightAwareTrackpollResponse({
            callsign: normalizedCallsign,
            fetchedAt,
            html,
            text,
          });
          if (trackpollResult.ok) {
            cacheResult(cacheStore, normalizedCallsign, trackpollResult, nowMs);
            return trackpollResult;
          }
        }
      } catch {
        recordExternalRequest({
          durationMs: Date.now() - trackpollStartedAt,
          metrics,
          result: "error",
          status: "ERR",
        });
      }
    }

    const result = parseFlightAwareFallbackPage({
      callsign: normalizedCallsign,
      fetchedAt,
      html,
    });
    cacheResult(cacheStore, normalizedCallsign, result, nowMs);
    return result;
  } catch (error) {
    recordExternalRequest({
      durationMs: Date.now() - pageStartedAt,
      metrics,
      result: "error",
      status: "ERR",
    });
    const message = error instanceof Error ? error.message : String(error);
    const isTimeout =
      error instanceof Error &&
      (error.name === "TimeoutError" || /timed out|aborted/i.test(message));
    return errorResult(isTimeout ? "timeout" : "network_failed", {
      fetchedAt,
      message,
    });
  }
}
