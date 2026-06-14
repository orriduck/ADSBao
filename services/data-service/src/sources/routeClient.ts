import type { FetchChannelInput, RealtimeEvent } from "../types.js";
import {
  buildFlightAwareLiveFlightUrl,
  cleanString as clean,
  escapeRegExp,
  extractMetaContent,
  htmlDecode,
  readFlightAwareResponseText,
  toNumber as numberOrNull,
} from "./flightAwareShared.js";

const ADSBDB_BASE = "https://api.adsbdb.com/v0";
const MAX_ROUTE_BYTES = 512 * 1024;
const ROUTE_TIMEOUT_MS = 9_000;
const ROUTE_QUEUE_INTERVAL_MS = 500;
const USER_AGENT = "ADSBao data-service/1.0 (+https://adsbao.dev)";
const FLIGHTAWARE_USER_AGENT =
  "ADSBao data-service/1.0 (+https://adsbao.dev; flightaware/html)";

type RouteFetchInput = FetchChannelInput & {
  fetchImpl?: typeof fetch;
  waitForTurn?: () => Promise<void>;
};

const upper = (value: unknown) => clean(value).toUpperCase();
const code = (value: unknown, min = 3, max = 4) => {
  const next = upper(value);
  return new RegExp(`^[A-Z0-9]{${min},${max}}$`).test(next) ? next : "";
};
const inRange = (
  value: number | null,
  {
    min,
    max,
  }: {
    min: number;
    max: number;
  },
) => value != null && Number.isFinite(value) && value >= min && value <= max;

function normalizeAirport(raw: Record<string, unknown> | null | undefined) {
  if (!raw || typeof raw !== "object") return null;
  const icao = code(raw.icao_code ?? raw.icao);
  const iata = code(raw.iata_code ?? raw.iata, 3, 3);
  const lat = numberOrNull(raw.latitude ?? raw.lat);
  const lon = numberOrNull(raw.longitude ?? raw.lon);
  if (!icao || lat == null || lon == null) return null;
  return {
    icao,
    iata,
    name: clean(raw.name),
    municipality: clean(raw.municipality),
    country: upper(raw.country_iso_name ?? raw.country),
    lat,
    lon,
  };
}

function normalizeRoute(callsign: string, payload: any) {
  const route = payload?.response?.flightroute;
  if (!route || typeof route !== "object") return null;
  const normalizedCallsign = upper(route.callsign || callsign);
  const origin = normalizeAirport(route.origin);
  const destination = normalizeAirport(route.destination);
  if (!normalizedCallsign || !origin || !destination) return null;
  const routeIata =
    origin.iata && destination.iata ? `${origin.iata}-${destination.iata}` : "";
  return {
    callsign: normalizedCallsign,
    callsignIcao: upper(route.callsign_icao) || normalizedCallsign,
    callsignIata: upper(route.callsign_iata),
    number: clean(route.number),
    airline: {
      icao: code(route.airline?.icao, 2, 3) || normalizedCallsign.slice(0, 3),
      iata: code(route.airline?.iata, 2, 2),
      name: clean(route.airline?.name),
      callsign: "",
      iconUrl: "",
    },
    origin,
    destination,
    route: {
      icao: `${origin.icao}-${destination.icao}`,
      iata: routeIata,
    },
    airports: [origin, destination],
    source: "adsbdb",
    confidence: "reference-data",
  };
}

function extractTitle(html: unknown) {
  const match = /<title[^>]*>([^<]*)<\/title>/i.exec(String(html || ""));
  return htmlDecode(match?.[1] || extractMetaContent(html, "title"));
}

function extractAirlineName({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  const titleMatch =
    /\)\s+(.+?)\s+Flight Tracking(?:\s+and\s+History)?/i.exec(title);
  if (titleMatch?.[1]) return clean(titleMatch[1]);

  const descriptionMatch = /^Track\s+(.+?)\s+\([A-Z0-9]{2,3}\)\s+#/i.exec(
    description,
  );
  return clean(descriptionMatch?.[1] || "");
}

function extractIataAndNumber({
  callsign,
  description,
  title,
}: {
  callsign: string;
  description: string;
  title: string;
}) {
  const titleMatch = /^([A-Z0-9]{2})(\d{1,5}[A-Z]?)\s+\(/i.exec(title);
  if (titleMatch) {
    return {
      airlineIata: upper(titleMatch[1]),
      number: upper(titleMatch[2]),
    };
  }

  const descriptionMatch = /\(([A-Z0-9]{2})\)\s+#(\d{1,5}[A-Z]?)/i.exec(
    description,
  );
  if (descriptionMatch) {
    return {
      airlineIata: upper(descriptionMatch[1]),
      number: upper(descriptionMatch[2]),
    };
  }

  const callsignMatch = /^[A-Z]{2,3}(\d{1,5}[A-Z]?)$/.exec(callsign);
  return {
    airlineIata: "",
    number: upper(callsignMatch?.[1] || ""),
  };
}

function extractJsonString(block: string, key: string) {
  const match = new RegExp(`"${escapeRegExp(key)}"\\s*:\\s*"([^"]*)"`, "i").exec(
    block,
  );
  return htmlDecode(match?.[1] || "");
}

function normalizeFlightAwareAirport(airport: Record<string, unknown> | null) {
  if (!airport) return null;
  const lat = numberOrNull(airport.lat);
  const lon = numberOrNull(airport.lon);
  const icao = code(airport.icao || airport.ident || airport.code);
  if (
    !icao ||
    !inRange(lat, { min: -90, max: 90 }) ||
    !inRange(lon, { min: -180, max: 180 })
  ) {
    return null;
  }
  return {
    icao,
    iata: code(airport.iata, 3, 3),
    name: clean(airport.name),
    municipality: clean(airport.city || airport.municipality),
    country: upper(airport.country),
    lat,
    lon,
  };
}

function extractEmbeddedAirport(html: unknown, key: string, expectedIcao: string) {
  const pattern = new RegExp(`"${escapeRegExp(key)}"\\s*:\\s*\\{`, "gi");
  const source = String(html || "");
  const normalizedExpectedIcao = code(expectedIcao);
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source))) {
    const block = source.slice(match.index, match.index + 1800);
    const icao = code(extractJsonString(block, "icao"));
    if (normalizedExpectedIcao && icao !== normalizedExpectedIcao) continue;

    const coordMatch =
      /"coord"\s*:\s*\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/i.exec(
        block,
      );
    const lon = numberOrNull(coordMatch?.[1]);
    const lat = numberOrNull(coordMatch?.[2]);
    if (
      !icao ||
      !inRange(lat, { min: -90, max: 90 }) ||
      !inRange(lon, { min: -180, max: 180 })
    ) {
      continue;
    }

    const friendlyLocation = extractJsonString(block, "friendlyLocation");
    return {
      icao,
      iata: code(extractJsonString(block, "iata"), 3, 3),
      name: extractJsonString(block, "friendlyName"),
      municipality: clean(friendlyLocation.split(",")[0]),
      country: "",
      lat,
      lon,
    };
  }
  return null;
}

function buildFlightAwareAirlineLogoUrl(airlineIcao: unknown) {
  const normalized = code(airlineIcao, 2, 3);
  return normalized
    ? `https://www.flightaware.com/images/airline_logos/90p/${normalized}.png`
    : "";
}

function normalizeFlightAwareRoute(callsign: string, html: string) {
  const normalizedCallsign = upper(callsign);
  if (!/^[A-Z][A-Z0-9]{2,7}$/.test(normalizedCallsign)) return null;

  const originIcao = code(extractMetaContent(html, "origin"));
  const destinationIcao = code(extractMetaContent(html, "destination"));
  const airlineIcao =
    code(extractMetaContent(html, "airline"), 2, 3) || normalizedCallsign.slice(0, 3);
  if (!originIcao || !destinationIcao || !airlineIcao) return null;

  const title = extractTitle(html);
  const description =
    extractMetaContent(html, "twitter:description") ||
    extractMetaContent(html, "og:description") ||
    extractMetaContent(html, "description");
  const { airlineIata, number } = extractIataAndNumber({
    callsign: normalizedCallsign,
    description,
    title,
  });
  const origin = normalizeFlightAwareAirport(
    extractEmbeddedAirport(html, "origin", originIcao),
  );
  const destination = normalizeFlightAwareAirport(
    extractEmbeddedAirport(html, "destination", destinationIcao),
  );
  if (!origin || !destination) return null;

  const routeIata = origin.iata && destination.iata ? `${origin.iata}-${destination.iata}` : "";
  return {
    callsign: normalizedCallsign,
    callsignIcao: normalizedCallsign,
    callsignIata: airlineIata && number ? `${airlineIata}${number}` : "",
    number,
    airline: {
      icao: airlineIcao,
      iata: airlineIata,
      name: extractAirlineName({ title, description }),
      callsign: "",
      iconUrl: buildFlightAwareAirlineLogoUrl(airlineIcao),
    },
    origin,
    destination,
    route: {
      icao: `${origin.icao}-${destination.icao}`,
      iata: routeIata,
    },
    airports: [origin, destination],
    source: "flightaware",
    confidence: "scraped-reference",
  };
}

let routeQueue = Promise.resolve();
let lastRouteStartedAt = 0;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function waitForRouteTurn() {
  const turn = routeQueue.then(async () => {
    const waitMs = Math.max(
      0,
      ROUTE_QUEUE_INTERVAL_MS - (Date.now() - lastRouteStartedAt),
    );
    if (waitMs > 0) await sleep(waitMs);
    lastRouteStartedAt = Date.now();
  });
  routeQueue = turn.catch(() => {});
  return turn;
}

async function readJson(response: Response) {
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > MAX_ROUTE_BYTES) {
    throw new Error("Route response too large");
  }
  return JSON.parse(text);
}

async function fetchFlightAwareRouteChannel({
  channel,
  metrics,
  target,
  fetchImpl = fetch,
  waitForTurn: waitForTurnImpl = waitForRouteTurn,
}: RouteFetchInput): Promise<RealtimeEvent> {
  if (target.kind !== "route") throw new Error("Expected route polling target");
  await waitForTurnImpl();
  const url = buildFlightAwareLiveFlightUrl(target.callsign);
  if (!url) throw new Error("Invalid FlightAware route callsign");
  const startedAt = Date.now();
  let status: number | string | null = null;
  let route: ReturnType<typeof normalizeFlightAwareRoute> | null = null;
  try {
    const response = await fetchImpl(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": FLIGHTAWARE_USER_AGENT,
      },
      signal: AbortSignal.timeout(ROUTE_TIMEOUT_MS),
    });
    status = response.status;
    if (!response.ok && response.status !== 404) {
      throw new Error(`flightaware route HTTP ${response.status}`);
    }
    route =
      response.status === 404
        ? null
        : normalizeFlightAwareRoute(
            target.callsign,
            await readFlightAwareResponseText(response),
          );
    metrics?.recordExternalRequest({
      provider: "flightaware",
      endpoint: "route",
      result: "success",
      status,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    metrics?.recordExternalRequest({
      provider: "flightaware",
      endpoint: "route",
      result: "error",
      status: status ?? "ERR",
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
  return {
    type: "route:update",
    channel,
    source: "flightaware",
    fetchedAt: new Date().toISOString(),
    stale: false,
    data: {
      callsign: target.callsign,
      route,
    },
  };
}

export async function fetchRouteChannel({
  channel,
  metrics,
  target,
  fetchImpl = fetch,
  waitForTurn: waitForTurnImpl = waitForRouteTurn,
}: RouteFetchInput): Promise<RealtimeEvent> {
  if (target.kind !== "route") throw new Error("Expected route polling target");
  if (target.provider === "flightaware") {
    return fetchFlightAwareRouteChannel({
      channel,
      channelType: "route",
      metrics,
      target,
      params: {},
      fetchImpl,
      waitForTurn: waitForTurnImpl,
    });
  }
  await waitForTurnImpl();
  const url = `${ADSBDB_BASE}/callsign/${encodeURIComponent(target.callsign)}`;
  const startedAt = Date.now();
  let status: number | string | null = null;
  let route: ReturnType<typeof normalizeRoute> | null = null;
  try {
    const response = await fetchImpl(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(ROUTE_TIMEOUT_MS),
    });
    status = response.status;
    if (!response.ok && response.status !== 404) {
      throw new Error(`adsbdb route HTTP ${response.status}`);
    }
    route =
      response.status === 404
        ? null
        : normalizeRoute(target.callsign, await readJson(response));
    metrics?.recordExternalRequest({
      provider: "adsbdb",
      endpoint: "route",
      result: "success",
      status,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    metrics?.recordExternalRequest({
      provider: "adsbdb",
      endpoint: "route",
      result: "error",
      status: status ?? "ERR",
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
  return {
    type: "route:update",
    channel,
    source: "adsbdb",
    fetchedAt: new Date().toISOString(),
    stale: false,
    data: {
      callsign: target.callsign,
      route,
    },
  };
}
