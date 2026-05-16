import { readResponseJson } from "@/services/apiProxySecurity.js";
import { TRACE_PROVIDER_CHAIN } from "@/services/aviation/aircraftDataProviders.js";

import {
  AIRCRAFT_TRACE_MAX_BYTES,
  AIRCRAFT_TRACE_USER_AGENT,
  AircraftTraceProviderError,
} from "./aircraftTrace.models.js";
import { formatAircraftTraceAttempt } from "./aircraftTrace.utils.js";

const [TRACE_PROVIDER] = TRACE_PROVIDER_CHAIN;

async function fetchTrace({ hex }) {
  const url = TRACE_PROVIDER.buildTraceUrl({ hex });

  let response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": AIRCRAFT_TRACE_USER_AGENT,
      },
      next: { revalidate: 0 },
    });
  } catch (networkError) {
    throw new AircraftTraceProviderError(`network: ${networkError.message}`);
  }

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new AircraftTraceProviderError(`HTTP ${response.status}`, response.status);
  }

  try {
    return await readResponseJson(response, {
      label: `${TRACE_PROVIDER.id} aircraft trace response`,
      maxBytes: AIRCRAFT_TRACE_MAX_BYTES,
    });
  } catch (parseError) {
    throw new AircraftTraceProviderError(`parse: ${parseError.message}`);
  }
}

export const getAircraftTrace = async ({ hex } = {}) => {
  try {
    const recent = await fetchTrace({ hex });
    if (!recent) {
      return {
        found: false,
        source: TRACE_PROVIDER.id,
        attempts: [formatAircraftTraceAttempt(TRACE_PROVIDER.id, 404)],
      };
    }
    return {
      found: true,
      payload: { hex, recent, source: TRACE_PROVIDER.id },
      source: TRACE_PROVIDER.id,
      attempts: [formatAircraftTraceAttempt(TRACE_PROVIDER.id, 200)],
    };
  } catch (error) {
    const attempt = formatAircraftTraceAttempt(
      TRACE_PROVIDER.id,
      error.status || "ERR",
    );
    console.warn(
      `[aircraft-trace] ${TRACE_PROVIDER.id} failed`,
      error.status ? `status=${error.status}` : error.message,
    );
    error.attempts = [attempt];
    throw error;
  }
};
