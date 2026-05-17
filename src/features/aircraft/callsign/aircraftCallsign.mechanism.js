import { readResponseJson } from "../../../app/api/_shared/apiProxySecurity.js";
import { CALLSIGN_PROVIDER_CHAIN } from "../../aviation/aircraftDataProviders.js";
import {
  createAdaptiveProviderSelector,
  raceProviders,
} from "../../aviation/providerHealth.js";

import {
  AIRCRAFT_CALLSIGN_MAX_BYTES,
  AIRCRAFT_CALLSIGN_USER_AGENT,
  AircraftCallsignProviderError,
} from "./aircraftCallsign.models.js";

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
