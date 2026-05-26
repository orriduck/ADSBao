import { readResponseText } from "../../../app/api/_shared/apiProxySecurity.js";
import { buildAdsbaoUserAgent } from "../../../config/siteMeta.js";
import { normalizeRouteCallsign } from "../../aviation/flight-routes/flightRouteCallsign.js";

export const FLIGHTAWARE_FALLBACK_BASE = "https://www.flightaware.com/live/flight";
export const FLIGHTAWARE_FALLBACK_CACHE_TTL_MS = 60_000;
export const FLIGHTAWARE_FALLBACK_TIMEOUT_MS = 7_000;
export const FLIGHTAWARE_FALLBACK_USER_AGENT =
  buildAdsbaoUserAgent("flightaware/fallback-html");

const MAX_HTML_BYTES = 2 * 1024 * 1024;
const cache = new Map();
const requestTimes = [];

const toNumber = (value) => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const inRange = (value, min, max) =>
  Number.isFinite(value) && value >= min && value <= max;

const cleanString = (value) => String(value || "").trim();

const htmlDecode = (value) =>
  cleanString(value)
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");

const escapeRegExp = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function errorResult(errorType, { message = "", fetchedAt, upstreamStatus } = {}) {
  return {
    ok: false,
    hasPosition: false,
    errorType,
    message,
    upstreamStatus,
    fetchedAt: fetchedAt || new Date().toISOString(),
  };
}

function cacheFallbackResult(cacheStore, callsign, result, nowMs) {
  cacheStore.set(callsign, {
    result,
    expiresAt: nowMs + FLIGHTAWARE_FALLBACK_CACHE_TTL_MS,
  });
}

function extractMetaContent(html, key) {
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

function extractAssignedJson(html, name) {
  const marker = `var ${name} =`;
  const start = String(html || "").indexOf(marker);
  if (start < 0) return null;
  const objectStart = String(html).indexOf("{", start + marker.length);
  if (objectStart < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  const source = String(html);
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
      if (depth === 0) {
        return source.slice(objectStart, index + 1);
      }
    }
  }
  return null;
}

function readCoord(value) {
  if (!Array.isArray(value) || value.length < 2) return null;
  const lon = toNumber(value[0]);
  const lat = toNumber(value[1]);
  if (!inRange(lat, -90, 90) || !inRange(lon, -180, 180)) return null;
  return { lat, lon };
}

function altitudeFt(value) {
  const number = toNumber(value);
  if (number == null) return undefined;
  return Math.abs(number) < 1000 ? Math.round(number * 100) : Math.round(number);
}

function timestampIso(value) {
  const number = toNumber(value);
  if (number == null) return undefined;
  const ms = number < 10_000_000_000 ? number * 1000 : number;
  return new Date(ms).toISOString();
}

function normalizePositionKind({ point, flight }) {
  const label = cleanString(flight?.updateType || point?.type);
  if (/pred|tp/i.test(label)) return "predicted";
  if (/interp/i.test(label)) return "interpolated";
  if (/est|tentative/i.test(label)) return "estimated";
  return "observed";
}

function isTerminalFlight(flight, status = "") {
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

function selectBestFlight(flights) {
  const list = Object.values(flights || {}).filter(
    (flight) => flight && typeof flight === "object",
  );
  if (list.length === 0) return null;

  return list
    .map((flight, index) => {
      const hasPosition = Boolean(readCoord(flight.coord)) ||
        (Array.isArray(flight.track) && flight.track.some((point) => readCoord(point?.coord)));
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
    .sort((a, b) => b.score - a.score || a.index - b.index)[0]?.flight || null;
}

function selectPositionPoint(flight) {
  const topLevel = readCoord(flight?.coord);
  if (topLevel) {
    return {
      ...topLevel,
      timestamp: flight.timestamp,
      alt: flight.altitude,
      gs: flight.groundspeed,
      heading: flight.heading,
      type: flight.updateType,
    };
  }

  if (!Array.isArray(flight?.track)) return null;
  return flight.track
    .filter((point) => readCoord(point?.coord))
    .map((point) => ({ ...point, ...readCoord(point.coord) }))
    .sort((a, b) => (toNumber(b.timestamp) || 0) - (toNumber(a.timestamp) || 0))[0] || null;
}

function buildMetadata({ callsign, flight, fetchedAt, html }) {
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
    groundSpeedMph: undefined,
    trackDeg: toNumber(flight?.heading) ?? undefined,
    status,
    terminal,
    sourceUpdatedAt,
    fetchedAt,
    notes: ["flightaware-public-page"],
  };
}

export function buildFlightAwareFallbackUrl(callsign) {
  const normalized = normalizeRouteCallsign(callsign);
  if (!normalized) return "";
  return `${FLIGHTAWARE_FALLBACK_BASE}/${encodeURIComponent(normalized)}`;
}

export function isFlightAwareFallbackEnabled(env = process.env) {
  return String(env?.FLIGHTAWARE_FALLBACK_ENABLED || "true").toLowerCase() !== "false";
}

export function parseFlightAwareFallbackPage({ callsign, html, fetchedAt } = {}) {
  const normalizedCallsign = normalizeRouteCallsign(callsign);
  const fetched = fetchedAt || new Date().toISOString();
  if (!normalizedCallsign) {
    return errorResult("invalid_callsign", { fetchedAt: fetched });
  }

  const jsonText = extractAssignedJson(html, "trackpollBootstrap");
  if (!jsonText) {
    return errorResult("parse_failed", {
      message: "trackpollBootstrap not found",
      fetchedAt: fetched,
    });
  }

  let bootstrap;
  try {
    bootstrap = JSON.parse(jsonText);
  } catch (error) {
    return errorResult("parse_failed", {
      message: error.message,
      fetchedAt: fetched,
    });
  }

  const flight = selectBestFlight(bootstrap?.flights);
  if (!flight) {
    return errorResult("parse_failed", {
      message: "No flight entries found",
      fetchedAt: fetched,
    });
  }

  const metadata = buildMetadata({
    callsign: normalizedCallsign,
    flight,
    fetchedAt: fetched,
    html,
  });
  const point = selectPositionPoint(flight);
  if (!point) {
    return {
      ok: true,
      hasPosition: false,
      metadata,
    };
  }

  const kind = normalizePositionKind({ point, flight });
  const sourceUpdatedAt = timestampIso(point.timestamp) || metadata.sourceUpdatedAt;
  return {
    ok: true,
    hasPosition: true,
    position: {
      lat: point.lat,
      lon: point.lon,
      altitudeFt: altitudeFt(point.alt),
      groundSpeedKt: toNumber(point.gs) ?? metadata.groundSpeedKt,
      groundSpeedMph: metadata.groundSpeedMph,
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

export function clearFlightAwareFallbackCache() {
  cache.clear();
  requestTimes.length = 0;
}

function checkRateLimit(nowMs, { maxRequests = 20, windowMs = 60_000 } = {}) {
  while (requestTimes.length && nowMs - requestTimes[0] > windowMs) {
    requestTimes.shift();
  }
  if (requestTimes.length >= maxRequests) return false;
  requestTimes.push(nowMs);
  return true;
}

export async function getFlightAwareFallbackByCallsign(callsign, {
  env = process.env,
  fetchImpl = globalThis.fetch?.bind(globalThis),
  now = Date.now,
  timeoutMs = FLIGHTAWARE_FALLBACK_TIMEOUT_MS,
  cacheStore = cache,
} = {}) {
  const nowMs = now();
  const fetchedAt = new Date(nowMs).toISOString();
  if (!isFlightAwareFallbackEnabled(env)) {
    return errorResult("feature_disabled", { fetchedAt });
  }

  const normalizedCallsign = normalizeRouteCallsign(callsign);
  const url = buildFlightAwareFallbackUrl(normalizedCallsign);
  if (!normalizedCallsign || !url) {
    return errorResult("invalid_callsign", { fetchedAt });
  }
  if (!fetchImpl) {
    return errorResult("network_failed", {
      message: "fetch unavailable",
      fetchedAt,
    });
  }

  const cached = cacheStore.get(normalizedCallsign);
  if (cached && cached.expiresAt > nowMs) return cached.result;

  if (!checkRateLimit(nowMs)) {
    return errorResult("rate_limited", { fetchedAt });
  }

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

    if (response.status === 404) {
      return errorResult("not_found", { fetchedAt });
    }
    if (response.status === 429) {
      return errorResult("rate_limited", { fetchedAt });
    }
    if (response.status === 402) {
      const result = errorResult("payment_required", {
        message: "HTTP 402",
        upstreamStatus: 402,
        fetchedAt,
      });
      cacheFallbackResult(cacheStore, normalizedCallsign, result, nowMs);
      return result;
    }
    if (!response.ok) {
      return errorResult("network_failed", {
        message: `HTTP ${response.status}`,
        upstreamStatus: response.status,
        fetchedAt,
      });
    }

    const html = await readResponseText(response, {
      label: "flightaware fallback page",
      maxBytes: MAX_HTML_BYTES,
    });
    const result = parseFlightAwareFallbackPage({
      callsign: normalizedCallsign,
      html,
      fetchedAt,
    });
    cacheFallbackResult(cacheStore, normalizedCallsign, result, nowMs);
    return result;
  } catch (error) {
    const isTimeout =
      error?.name === "TimeoutError" ||
      /timed out|aborted/i.test(String(error?.message || ""));
    const result = errorResult(isTimeout ? "timeout" : "network_failed", {
      message: error?.message || "",
      fetchedAt,
    });
    if (env?.NODE_ENV === "development") {
      console.warn(
        `[flightaware-fallback] ${normalizedCallsign} ${result.errorType}`,
        result.message,
      );
    }
    return result;
  }
}
