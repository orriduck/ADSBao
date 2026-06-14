import type { FetchChannelInput, RealtimeEvent } from "../types.js";

const ADSBDB_BASE = "https://api.adsbdb.com/v0";
const MAX_ROUTE_BYTES = 512 * 1024;
const ROUTE_TIMEOUT_MS = 9_000;
const ROUTE_QUEUE_INTERVAL_MS = 500;
const USER_AGENT = "ADSBao data-service/1.0 (+https://adsbao.dev)";

type RouteFetchInput = FetchChannelInput & {
  fetchImpl?: typeof fetch;
  waitForTurn?: () => Promise<void>;
};

const clean = (value: unknown) => String(value || "").trim();
const upper = (value: unknown) => clean(value).toUpperCase();
const code = (value: unknown, min = 3, max = 4) => {
  const next = upper(value);
  return new RegExp(`^[A-Z0-9]{${min},${max}}$`).test(next) ? next : "";
};
const numberOrNull = (value: unknown) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
};

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

export async function fetchRouteChannel({
  channel,
  metrics,
  target,
  fetchImpl = fetch,
  waitForTurn: waitForTurnImpl = waitForRouteTurn,
}: RouteFetchInput): Promise<RealtimeEvent> {
  if (target.kind !== "route") throw new Error("Expected route polling target");
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
