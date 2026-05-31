import { readResponseJson } from "../../../app/api/_shared/apiProxySecurity";
import { POSITION_PROVIDER_CHAIN } from "../../aviation/aircraftDataProviders";
import {
  createAdaptiveProviderSelector,
  raceProviders,
} from "../../aviation/providerHealth";

import {
  AIRCRAFT_POSITIONS_MAX_BYTES,
  AIRCRAFT_POSITIONS_USER_AGENT,
  AircraftPositionProviderError,
} from "./aircraftPositions.models";
import {
  formatAircraftPositionAttempt,
} from "./aircraftPositions.utils";

const selector = createAdaptiveProviderSelector();

type AircraftPositionsRecord = Record<string, any>;

async function fetchProviderPayload(provider: AircraftPositionsRecord, { latitude, longitude, distanceNm }: AircraftPositionsRecord) {
  const url = provider.buildPositionUrl({
    lat: latitude,
    lon: longitude,
    distanceNm,
  });

  let response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": AIRCRAFT_POSITIONS_USER_AGENT,
      },
      next: { revalidate: 0 },
    });
  } catch (networkError: any) {
    throw new AircraftPositionProviderError(`network: ${networkError.message}`);
  }

  if (!response.ok) {
    throw new AircraftPositionProviderError(
      `HTTP ${response.status}`,
      response.status,
    );
  }

  let payload;
  try {
    payload = await readResponseJson(response, {
      label: `${provider.id} aircraft response`,
      maxBytes: AIRCRAFT_POSITIONS_MAX_BYTES,
    });
  } catch (parseError: any) {
    throw new AircraftPositionProviderError(`parse: ${parseError.message}`);
  }

  if (!payload || typeof payload !== "object" || !Array.isArray(payload.ac)) {
    throw new AircraftPositionProviderError("Invalid aircraft payload");
  }

  return payload;
}

const successResult = (provider: AircraftPositionsRecord, payload: AircraftPositionsRecord, attempts: string[]) => ({
  payload: { ...payload, source: provider.id },
  source: provider.id,
  attempts,
});

export const fetchAircraftPositions = async ({
  latitude,
  longitude,
  distanceNm,
}: AircraftPositionsRecord = {}) => {
  const fetcher = (provider) =>
    fetchProviderPayload(provider, { latitude, longitude, distanceNm });
  const attempts = [];

  const preferredId = selector.getPreferredId();
  const preferred = preferredId
    ? POSITION_PROVIDER_CHAIN.find((provider) => provider.id === preferredId)
    : null;

  if (preferred) {
    try {
      const payload = await fetcher(preferred);
      attempts.push(formatAircraftPositionAttempt(preferred.id));
      return successResult(preferred, payload, attempts);
    } catch (error: any) {
      attempts.push(formatAircraftPositionAttempt(preferred.id, error));
      console.warn(
        `[aircraft-positions] preferred ${preferred.id} failed, racing`,
        error.status ? `status=${error.status}` : error.message,
      );
      selector.clear();
    }
  }

  try {
    const { provider, payload } = await raceProviders(
      POSITION_PROVIDER_CHAIN,
      fetcher,
    );
    selector.setPreferredId(provider.id);
    attempts.push(formatAircraftPositionAttempt(provider.id));
    return successResult(provider, payload, attempts);
  } catch (aggregate: any) {
    const errors = aggregate?.errors || [aggregate];
    for (let index = 0; index < POSITION_PROVIDER_CHAIN.length; index += 1) {
      const provider = POSITION_PROVIDER_CHAIN[index];
      const error = errors[index];
      attempts.push(formatAircraftPositionAttempt(provider.id, error));
      console.warn(
        `[aircraft-positions] race: ${provider.id} failed`,
        error?.status ? `status=${error.status}` : error?.message,
      );
    }

    const lastError = errors[errors.length - 1];
    const error = new AircraftPositionProviderError(
      "Failed to load aircraft positions",
      Number(lastError?.status) || 502,
    );
    error.attempts = attempts;
    throw error;
  }
};
