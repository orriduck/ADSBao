import { readResponseJson } from "../../../app/api/_shared/apiProxySecurity";
import { CALLSIGN_PROVIDER_CHAIN } from "../../aviation/aircraftDataProviders";
import {
  createAdaptiveProviderSelector,
  raceProviders,
} from "../../aviation/providerHealth";
import {
  getFlightAwareFallbackByCallsign,
} from "../flightaware/flightAwareFallbackProvider";
import {
  annotateAdsbPosition,
  resolveTrackedFlightPosition,
} from "../tracking/trackedFlightPositionResolver";

import {
  AIRCRAFT_CALLSIGN_MAX_BYTES,
  AIRCRAFT_CALLSIGN_USER_AGENT,
  AircraftCallsignProviderError,
} from "./aircraftCallsign.models";

const selector = createAdaptiveProviderSelector();

const formatAttempt = (providerId, error) => {
  if (!error) return `${providerId}:200`;
  return `${providerId}:${error.status || "ERR"}`;
};

async function fetchProviderPayload(provider, { callsign }) {
  const url = provider.buildCallsignUrl({ callsign });

  let response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": AIRCRAFT_CALLSIGN_USER_AGENT,
      },
      next: { revalidate: 0 },
    });
  } catch (networkError) {
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
  } catch (parseError) {
    throw new AircraftCallsignProviderError(`parse: ${parseError.message}`);
  }

  if (!payload || typeof payload !== "object" || !Array.isArray(payload.ac)) {
    throw new AircraftCallsignProviderError("Invalid callsign payload");
  }

  return payload;
}

const successResult = (provider, payload, attempts) => ({
  payload: { ...payload, source: provider.id },
  source: provider.id,
  attempts,
});

export const fetchAircraftByCallsign = async ({ callsign } = {}) => {
  if (!callsign) {
    throw new AircraftCallsignProviderError("Callsign required", 400);
  }

  const fetcher = (provider) => fetchProviderPayload(provider, { callsign });
  const attempts = [];

  const preferredId = selector.getPreferredId();
  const preferred = preferredId
    ? CALLSIGN_PROVIDER_CHAIN.find((provider) => provider.id === preferredId)
    : null;

  if (preferred) {
    try {
      const payload = await fetcher(preferred);
      attempts.push(formatAttempt(preferred.id));
      return successResult(preferred, payload, attempts);
    } catch (error) {
      attempts.push(formatAttempt(preferred.id, error));
      console.warn(
        `[aircraft-callsign] preferred ${preferred.id} failed, racing`,
        error.status ? `status=${error.status}` : error.message,
      );
      selector.clear();
    }
  }

  try {
    const { provider, payload } = await raceProviders(
      CALLSIGN_PROVIDER_CHAIN,
      fetcher,
    );
    selector.setPreferredId(provider.id);
    attempts.push(formatAttempt(provider.id));
    return successResult(provider, payload, attempts);
  } catch (aggregate) {
    const errors = aggregate?.errors || [aggregate];
    for (let index = 0; index < CALLSIGN_PROVIDER_CHAIN.length; index += 1) {
      const provider = CALLSIGN_PROVIDER_CHAIN[index];
      const error = errors[index];
      attempts.push(formatAttempt(provider.id, error));
      console.warn(
        `[aircraft-callsign] race: ${provider.id} failed`,
        error?.status ? `status=${error.status}` : error?.message,
      );
    }

    const lastError = errors[errors.length - 1];
    const error = new AircraftCallsignProviderError(
      "Failed to load aircraft by callsign",
      Number(lastError?.status) || 502,
    );
    error.attempts = attempts;
    throw error;
  }
};

function pickFreshest(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  let best = entries[0];
  for (const entry of entries) {
    const a = Number(entry?.seen_pos ?? entry?.seen ?? Number.POSITIVE_INFINITY);
    const b = Number(best?.seen_pos ?? best?.seen ?? Number.POSITIVE_INFINITY);
    if (a < b) best = entry;
  }
  return best;
}

async function fetchAllCallsignProviders({ callsign }) {
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

function annotatePayload(payload, { source, now, fallback, trackingState }) {
  return {
    ...payload,
    ac: (payload?.ac || []).map((aircraft) =>
      annotateAdsbPosition(aircraft, { source, now }),
    ),
    source,
    flightAwareFallback: sanitizeFallbackForClient(fallback),
    trackingState,
  };
}

function payloadForResolvedPosition({ resolved, callsign, fallback, now }) {
  const clientFallback = sanitizeFallbackForClient(fallback);
  if (!resolved?.position) {
    return {
      ac: [],
      source: "",
      now: now / 1000,
      flightAwareFallback: clientFallback,
      trackingState: resolved.trackingState,
    };
  }

  if (resolved.source === "flightaware") {
    return {
      ac: [resolved.position],
      source: "flightaware",
      now: now / 1000,
      flightAwareFallback: clientFallback,
      trackingState: resolved.trackingState,
    };
  }

  return {
    ac: [resolved.position],
    source: resolved.source || "",
    now: now / 1000,
    flightAwareFallback: clientFallback,
    callsign,
    trackingState: resolved.trackingState,
  };
}

function sanitizeFallbackForClient(fallback) {
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
} = {}) => {
  if (!callsign) {
    throw new AircraftCallsignProviderError("Callsign required", 400);
  }

  const primaryResults = await fetchPrimaryProviders({ callsign });
  const attempts = primaryResults.map((result) => formatAttempt(result.provider.id));
  const bySource = new Map(
    primaryResults.map((result) => [result.provider.id, result.payload]),
  );
  const adsbLolPosition = pickFreshest(bySource.get("adsb.lol")?.ac);
  const airplanesLivePosition = pickFreshest(bySource.get("airplanes.live")?.ac);

  const resolved = await resolveTrackedFlightPosition({
    adsbLolPosition,
    airplanesLivePosition,
    getFlightAwareFallback,
    callsign,
    featureEnabled,
    now,
  });

  const sourcePayload = bySource.get(resolved.source);
  if (sourcePayload && resolved.source !== "flightaware") {
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
