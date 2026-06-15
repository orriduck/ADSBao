import { readResponseJson } from "@/server/http/apiProxySecurity";
import { CALLSIGN_PROVIDER_CHAIN } from "../../aviation/aircraftDataProviders";
import {
  getFlightAwareFallbackByCallsign,
} from "../flightaware/flightAwareFallbackProvider";
import {
  annotateAdsbPosition,
  resolveTrackedFlightPosition,
} from "../tracking/trackedFlightPositionResolver";

import {
  AIRCRAFT_CALLSIGN_MAX_BYTES,
  AIRCRAFT_CALLSIGN_PROVIDER_TIMEOUT_MS,
  AIRCRAFT_CALLSIGN_USER_AGENT,
  AircraftCallsignProviderError,
} from "./aircraftCallsign.models";

type AircraftCallsignRecord = Record<string, any>;

const formatAttempt = (providerId: string, error?: any) => {
  if (!error) return `${providerId}:200`;
  return `${providerId}:${error.status || "ERR"}`;
};

async function fetchProviderPayload(provider: AircraftCallsignRecord, { callsign }: AircraftCallsignRecord) {
  const url = provider.buildCallsignUrl({ callsign });

  let response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": AIRCRAFT_CALLSIGN_USER_AGENT,
      },
      signal: AbortSignal.timeout(AIRCRAFT_CALLSIGN_PROVIDER_TIMEOUT_MS),
    });
  } catch (networkError: any) {
    throw new AircraftCallsignProviderError(
      `network: ${networkError.message}`,
    );
  }

  if (!response.ok) {
    throw new AircraftCallsignProviderError(
      `HTTP ${response.status}`,
      response.status,
    );
  }

  let payload;
  try {
    payload = await readResponseJson(response, {
      label: `${provider.id} callsign response`,
      maxBytes: AIRCRAFT_CALLSIGN_MAX_BYTES,
    });
  } catch (parseError: any) {
    throw new AircraftCallsignProviderError(`parse: ${parseError.message}`);
  }

  if (!payload || typeof payload !== "object" || !Array.isArray(payload.ac)) {
    throw new AircraftCallsignProviderError("Invalid callsign payload");
  }

  return payload;
}

function pickFreshest(entries: AircraftCallsignRecord[] | null | undefined) {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  let best = entries[0];
  for (const entry of entries) {
    const a = Number(entry?.seen_pos ?? entry?.seen ?? Number.POSITIVE_INFINITY);
    const b = Number(best?.seen_pos ?? best?.seen ?? Number.POSITIVE_INFINITY);
    if (a < b) best = entry;
  }
  return best;
}

async function fetchAllCallsignProviders({ callsign }: AircraftCallsignRecord) {
  const settled = await Promise.allSettled(
    CALLSIGN_PROVIDER_CHAIN.map(async (provider) => ({
      provider,
      payload: await fetchProviderPayload(provider, { callsign }),
    })),
  );

  return settled
    .map((result, index) => {
      const provider = CALLSIGN_PROVIDER_CHAIN[index];
      if (result.status === "fulfilled") return result.value;
      console.warn(
        `[aircraft-callsign] ${provider.id} failed`,
        result.reason?.status ? `status=${result.reason.status}` : result.reason?.message,
      );
      return null;
    })
    .filter(Boolean);
}

function statusFetchedAt(now: unknown) {
  return new Date(Number(now) || Date.now()).toISOString();
}

function annotatePayload(payload: AircraftCallsignRecord, { source, now, fallback, trackingState }: AircraftCallsignRecord) {
  return {
    ...payload,
    ac: (payload?.ac || []).map((aircraft) =>
      annotateAdsbPosition(aircraft, { source, now }),
    ),
    source,
    fetchedAt: statusFetchedAt(now),
    flightAwareFallback: sanitizeFallbackForClient(fallback),
    trackingState,
  };
}

function payloadForResolvedPosition({ resolved, callsign, fallback, now }: AircraftCallsignRecord) {
  const clientFallback = sanitizeFallbackForClient(fallback);
  if (!resolved?.position) {
    return {
      ac: [],
      source: "",
      now: now / 1000,
      fetchedAt: statusFetchedAt(now),
      flightAwareFallback: clientFallback,
      trackingState: resolved.trackingState,
    };
  }

  if (resolved.source === "flightaware") {
    return {
      ac: [resolved.position],
      source: "flightaware",
      now: now / 1000,
      fetchedAt: statusFetchedAt(now),
      flightAwareFallback: clientFallback,
      trackingState: resolved.trackingState,
    };
  }

  return {
    ac: [resolved.position],
    source: resolved.source || "",
    now: now / 1000,
    fetchedAt: statusFetchedAt(now),
    flightAwareFallback: clientFallback,
    callsign,
    trackingState: resolved.trackingState,
  };
}

function sanitizeFallbackForClient(fallback: AircraftCallsignRecord | null | undefined) {
  if (!fallback || typeof fallback !== "object") return null;
  const { raw: _raw, ...safe } = fallback;
  return safe;
}

export const fetchTrackedAircraftByCallsign = async ({
  callsign,
  featureEnabled = false,
  fetchPrimaryProviders = fetchAllCallsignProviders,
  getFlightAwareFallback = getFlightAwareFallbackByCallsign,
  now = Date.now(),
}: AircraftCallsignRecord = {}) => {
  if (!callsign) {
    throw new AircraftCallsignProviderError("Callsign required", 400);
  }

  const primaryResults = await fetchPrimaryProviders({ callsign });
  const attempts = primaryResults.map((result) => formatAttempt(result.provider.id));
  const bySource = new Map<string, AircraftCallsignRecord>(
    primaryResults.map((result) => [result.provider.id, result.payload]),
  );
  const adsbLolPosition = pickFreshest(bySource.get("adsb.lol")?.ac);
  const airplanesLivePosition = pickFreshest(bySource.get("airplanes.live")?.ac);
  const adsbFiPosition = pickFreshest(bySource.get("adsb.fi")?.ac);

  const resolved = await resolveTrackedFlightPosition({
    adsbLolPosition,
    airplanesLivePosition,
    adsbFiPosition,
    getFlightAwareFallback,
    callsign,
    featureEnabled,
    now,
  });

  const sourcePayload = bySource.get(resolved.source) as AircraftCallsignRecord | undefined;
  if (
    sourcePayload &&
    resolved.source !== "flightaware" &&
    resolved.trackingState?.status === "adsb_live"
  ) {
    return {
      payload: annotatePayload(sourcePayload, {
        source: resolved.source,
        now,
        fallback: resolved.fallback,
        trackingState: resolved.trackingState,
      }),
      source: resolved.source,
      attempts,
    };
  }

  return {
    payload: payloadForResolvedPosition({
      resolved,
      callsign,
      fallback: resolved.fallback,
      now,
    }),
    source: resolved.source || "none",
    attempts,
  };
};
