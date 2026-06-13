import type { FetchChannelInput, RealtimeEvent } from "../types.js";
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

async function fetchProviderJson(url: string, timeoutMs = DEFAULT_TIMEOUT_MS) {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new AdsbProviderError(
      error instanceof Error ? error.message : "network error",
      "ERR",
    );
  }

  if (!response.ok) {
    throw new AdsbProviderError(`HTTP ${response.status}`, response.status);
  }

  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > MAX_AIRCRAFT_BYTES) {
    throw new AdsbProviderError("ADS-B response too large", "SIZE");
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new AdsbProviderError("Invalid ADS-B JSON", "PARSE");
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
      return normalizeProviderPayload(provider, await fetchProviderJson(url));
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
      return normalizeProviderPayload(provider, await fetchProviderJson(url));
    },
  });
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
      return normalizeProviderPayload(provider, await fetchProviderJson(url));
    },
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
    return eventFromPayload(input, await fetchCallsign(input));
  }
  return eventFromPayload(input, await fetchAircraft(input));
}
