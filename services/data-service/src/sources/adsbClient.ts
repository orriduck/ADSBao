import type {
  ExternalRequestEndpoint,
  FetchChannelInput,
  RealtimeEvent,
} from "../types.js";
import type { FlightAwareFallbackResult } from "./flightAwareFallback.js";
import { getFlightAwareFallbackByCallsign } from "./flightAwareFallback.js";
import { fetchWithProviderFallback } from "./providerFallback.js";

const DEFAULT_TIMEOUT_MS = 2_800;
const MAX_AIRCRAFT_BYTES = 2 * 1024 * 1024;
const USER_AGENT = "ADSBao data-service/1.0 (+https://adsbao.dev)";

type Provider = {
  id: string;
  buildPositionUrl?: (input: {
    lat: number;
    lon: number;
    distanceNm: number;
  }) => string;
  buildCallsignUrl?: (input: { callsign: string }) => string;
  buildAircraftUrl?: (input: { hex: string }) => string;
  normalizePayload?: (payload: Record<string, unknown>) => Record<string, unknown>;
};

class AdsbProviderError extends Error {
  status: number | string | null;

  constructor(message: string, status: number | string | null = null) {
    super(message);
    this.name = "AdsbProviderError";
    this.status = status;
  }
}

const ADSB_LOL: Provider = {
  id: "adsb.lol",
  buildPositionUrl: ({ lat, lon, distanceNm }) =>
    `https://api.adsb.lol/v2/lat/${encodeURIComponent(String(lat))}/lon/${encodeURIComponent(String(lon))}/dist/${encodeURIComponent(String(distanceNm))}`,
  buildCallsignUrl: ({ callsign }) =>
    `https://api.adsb.lol/v2/callsign/${encodeURIComponent(callsign)}`,
  buildAircraftUrl: ({ hex }) =>
    `https://api.adsb.lol/v2/hex/${encodeURIComponent(hex)}`,
};

const AIRPLANES_LIVE: Provider = {
  id: "airplanes.live",
  buildPositionUrl: ({ lat, lon, distanceNm }) =>
    `https://api.airplanes.live/v2/point/${encodeURIComponent(String(lat))}/${encodeURIComponent(String(lon))}/${encodeURIComponent(String(distanceNm))}`,
  buildCallsignUrl: ({ callsign }) =>
    `https://api.airplanes.live/v2/callsign/${encodeURIComponent(callsign)}`,
  buildAircraftUrl: ({ hex }) =>
    `https://api.airplanes.live/v2/hex/${encodeURIComponent(hex)}`,
};

const ADSB_FI: Provider = {
  id: "adsb.fi",
  buildPositionUrl: ({ lat, lon, distanceNm }) =>
    `https://opendata.adsb.fi/api/v2/lat/${encodeURIComponent(String(lat))}/lon/${encodeURIComponent(String(lon))}/dist/${encodeURIComponent(String(distanceNm))}`,
  buildCallsignUrl: ({ callsign }) =>
    `https://opendata.adsb.fi/api/v2/callsign/${encodeURIComponent(callsign)}`,
  buildAircraftUrl: ({ hex }) =>
    `https://opendata.adsb.fi/api/v2/hex/${encodeURIComponent(hex)}`,
  normalizePayload: (payload) =>
    Array.isArray(payload.aircraft)
      ? { ...payload, ac: payload.aircraft }
      : payload,
};

const POSITION_PROVIDER_CHAIN = Object.freeze([ADSB_LOL, AIRPLANES_LIVE, ADSB_FI]);
const CALLSIGN_PROVIDER_CHAIN = Object.freeze([ADSB_LOL, AIRPLANES_LIVE, ADSB_FI]);
const AIRCRAFT_PROVIDER_CHAIN = Object.freeze([ADSB_LOL, AIRPLANES_LIVE, ADSB_FI]);
const FLIGHTAWARE_PROVIDER: Provider = {
  id: "flightaware",
};

function isEmptyAircraftPayload(payload: Record<string, unknown>) {
  return !Array.isArray(payload.ac) || payload.ac.length === 0;
}

async function fetchProviderPayload({
  endpoint,
  input,
  provider,
  url,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: {
  endpoint: ExternalRequestEndpoint;
  input: FetchChannelInput;
  provider: Provider;
  url: string;
  timeoutMs?: number;
}) {
  const startedAt = Date.now();
  let status: number | string | null = null;
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    status = response.status;

    if (!response.ok) {
      throw new AdsbProviderError(`HTTP ${response.status}`, response.status);
    }

    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > MAX_AIRCRAFT_BYTES) {
      status = "SIZE";
      throw new AdsbProviderError("ADS-B response too large", status);
    }

    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      status = "PARSE";
      throw new AdsbProviderError("Invalid ADS-B JSON", status);
    }

    const normalized = normalizeProviderPayload(
      provider,
      payload as Record<string, unknown>,
    );
    input.metrics?.recordExternalRequest({
      provider: provider.id,
      endpoint,
      result: "success",
      status,
      durationMs: Date.now() - startedAt,
    });
    return normalized;
  } catch (error) {
    const providerError =
      error instanceof AdsbProviderError
        ? error
        : new AdsbProviderError(
            error instanceof Error ? error.message : "network error",
            "ERR",
          );
    input.metrics?.recordExternalRequest({
      provider: provider.id,
      endpoint,
      result: "error",
      status: providerError.status ?? status ?? "ERR",
      durationMs: Date.now() - startedAt,
    });
    throw providerError;
  }
}

function normalizeProviderPayload(provider: Provider, payload: Record<string, unknown>) {
  const normalized =
    typeof provider.normalizePayload === "function"
      ? provider.normalizePayload(payload)
      : payload;
  if (!normalized || typeof normalized !== "object" || !Array.isArray(normalized.ac)) {
    throw new AdsbProviderError("Invalid aircraft payload", "SHAPE");
  }
  return normalized;
}

async function fetchPositions(input: FetchChannelInput) {
  if (input.target.kind !== "positions") {
    throw new Error("Expected positions polling target");
  }
  const target = input.target;

  return fetchWithProviderFallback({
    providers: POSITION_PROVIDER_CHAIN.filter((provider) => provider.buildPositionUrl),
    fetchProvider: async (provider) => {
      const url = provider.buildPositionUrl?.({
        lat: target.lat,
        lon: target.lon,
        distanceNm: target.distNm,
      });
      if (!url) throw new AdsbProviderError("Provider has no position URL");
      return fetchProviderPayload({
        endpoint: "positions",
        input,
        provider,
        url,
      });
    },
  });
}

async function fetchCallsign(input: FetchChannelInput) {
  if (input.target.kind !== "callsign") {
    throw new Error("Expected callsign polling target");
  }
  const target = input.target;

  return fetchWithProviderFallback({
    providers: CALLSIGN_PROVIDER_CHAIN.filter((provider) => provider.buildCallsignUrl),
    fetchProvider: async (provider) => {
      const url = provider.buildCallsignUrl?.({
        callsign: target.callsign,
      });
      if (!url) throw new AdsbProviderError("Provider has no callsign URL");
      return fetchProviderPayload({
        endpoint: "callsign",
        input,
        provider,
        url,
      });
    },
    shouldRetryPayload: isEmptyAircraftPayload,
  });
}

function toFiniteNumber(value: unknown) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeFlightAwareAircraft({
  callsign,
  fallback,
}: {
  callsign: string;
  fallback: FlightAwareFallbackResult;
}) {
  const position = fallback.position || {};
  const latitude = toFiniteNumber(position.lat);
  const longitude = toFiniteNumber(position.lon);
  if (latitude == null || longitude == null) return null;

  const altitudeFt = toFiniteNumber(position.altitudeFt);
  const groundSpeedKt = toFiniteNumber(position.groundSpeedKt);
  const trackDeg = toFiniteNumber(position.trackDeg ?? position.headingDeg);
  const normalizedCallsign = String(position.callsign || callsign || "")
    .trim()
    .toUpperCase();

  return {
    hex: String(position.hex || "").trim().toLowerCase() || undefined,
    flight: normalizedCallsign ? `${normalizedCallsign.padEnd(8, " ")} ` : undefined,
    callsign: normalizedCallsign || undefined,
    lat: latitude,
    lon: longitude,
    alt_baro: altitudeFt ?? undefined,
    gs: groundSpeedKt ?? undefined,
    track: trackDeg ?? undefined,
    seen: 0,
    type: "flightaware",
    flight_position_source: "flightaware",
    flightAwareUrl: position.flightAwareUrl,
    origin: position.origin,
    destination: position.destination,
    route: position.route,
    status: position.status,
    terminal: position.terminal,
    quality: position.quality,
  };
}

function getFlightAwareTrackingState(fallback: FlightAwareFallbackResult) {
  const terminal =
    fallback.position?.terminal === true ||
    fallback.position?.quality?.terminal === true ||
    fallback.metadata?.terminal === true;
  if (terminal) {
    return {
      status: "flightaware_terminal",
      source: "flightaware",
      fetchedAt: fallback.fetchedAt,
      sourceUpdatedAt: fallback.position?.quality?.sourceUpdatedAt,
    };
  }
  if (fallback.ok && fallback.hasPosition === true) {
    return {
      status: "flightaware_active",
      source: "flightaware",
      fetchedAt: fallback.fetchedAt,
      sourceUpdatedAt: fallback.position?.quality?.sourceUpdatedAt,
    };
  }
  return {
    status: "missing",
    source: "flightaware",
    fetchedAt: fallback.fetchedAt,
    errorType: fallback.errorType,
  };
}

function getFlightAwareAttemptStatus(fallback: FlightAwareFallbackResult) {
  if (fallback.ok) return "200";
  return String(fallback.upstreamStatus ?? fallback.errorType ?? "ERR");
}

async function fetchCallsignWithFlightAwareFallback(input: FetchChannelInput) {
  if (input.target.kind !== "callsign") {
    throw new Error("Expected callsign polling target");
  }

  const adsbResult = await fetchCallsign(input);
  if (!isEmptyAircraftPayload(adsbResult.payload)) return adsbResult;

  const fallback = await getFlightAwareFallbackByCallsign(input.target.callsign, {
    metrics: input.metrics,
  });
  const attempts = [
    ...adsbResult.attempts,
    `flightaware:${getFlightAwareAttemptStatus(fallback)}`,
  ];
  const aircraft = normalizeFlightAwareAircraft({
    callsign: input.target.callsign,
    fallback,
  });
  const trackingState = getFlightAwareTrackingState(fallback);

  if (!aircraft || fallback.ok !== true || fallback.hasPosition !== true) {
    return {
      ...adsbResult,
      attempts,
      payload: {
        ...adsbResult.payload,
        source: adsbResult.provider.id,
        callsign: input.target.callsign,
        flightAwareFallback: fallback,
        trackingState,
      },
    };
  }

  return {
    provider: FLIGHTAWARE_PROVIDER,
    attempts,
    payload: {
      ac: [aircraft],
      source: "flightaware",
      callsign: input.target.callsign,
      now: Date.now() / 1000,
      fetchedAt: fallback.fetchedAt,
      flightAwareFallback: fallback,
      trackingState,
    },
  };
}

async function fetchAircraft(input: FetchChannelInput) {
  if (input.target.kind !== "aircraft") {
    throw new Error("Expected aircraft polling target");
  }
  const target = input.target;

  return fetchWithProviderFallback({
    providers: AIRCRAFT_PROVIDER_CHAIN.filter((provider) => provider.buildAircraftUrl),
    fetchProvider: async (provider) => {
      const url = provider.buildAircraftUrl?.({
        hex: target.hex,
      });
      if (!url) throw new AdsbProviderError("Provider has no aircraft URL");
      return fetchProviderPayload({
        endpoint: "aircraft",
        input,
        provider,
        url,
      });
    },
    shouldRetryPayload: isEmptyAircraftPayload,
  });
}

function eventFromPayload(
  input: FetchChannelInput,
  result: {
    provider: Provider;
    payload: Record<string, unknown>;
    attempts: string[];
  },
): RealtimeEvent {
  return {
    type: "aircraft:update",
    channel: input.channel,
    source: result.provider.id,
    fetchedAt: new Date().toISOString(),
    stale: false,
    data: {
      ...result.payload,
      source: result.provider.id,
      attempts: result.attempts,
    },
  };
}

export async function fetchAdsbChannel(input: FetchChannelInput): Promise<RealtimeEvent> {
  if (input.target.kind === "positions") {
    return eventFromPayload(input, await fetchPositions(input));
  }
  if (input.target.kind === "callsign") {
    if (input.target.flightAwareFallback === true) {
      return eventFromPayload(input, await fetchCallsignWithFlightAwareFallback(input));
    }
    return eventFromPayload(input, await fetchCallsign(input));
  }
  return eventFromPayload(input, await fetchAircraft(input));
}
