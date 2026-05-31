import { readResponseJson } from "../../../app/api/_shared/apiProxySecurity";
import { TRACE_PROVIDER_CHAIN } from "../../aviation/aircraftDataProviders";

import {
  AIRCRAFT_TRACE_MAX_BYTES,
  AIRCRAFT_TRACE_USER_AGENT,
  AircraftTraceProviderError,
} from "./aircraftTrace.models";
import { formatAircraftTraceAttempt } from "./aircraftTrace.utils";

const [TRACE_PROVIDER] = TRACE_PROVIDER_CHAIN;

type AircraftTraceMechanismRecord = Record<string, any>;

function buildFreshTraceUrl({ hex, full }: AircraftTraceMechanismRecord) {
  const rawUrl = full
    ? TRACE_PROVIDER.buildFullTraceUrl({ hex })
    : TRACE_PROVIDER.buildTraceUrl({ hex });
  const url = new URL(rawUrl);
  url.searchParams.set("_", String(Date.now()));
  return url.toString();
}

async function fetchTrace({ hex, full = false }: AircraftTraceMechanismRecord) {
  const url = buildFreshTraceUrl({ hex, full });

  let response;
  try {
    response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache, no-store, max-age=0",
        Pragma: "no-cache",
        "User-Agent": AIRCRAFT_TRACE_USER_AGENT,
      },
    });
  } catch (networkError: any) {
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
  } catch (parseError: any) {
    throw new AircraftTraceProviderError(`parse: ${parseError.message}`);
  }
}

export const getAircraftTrace = async ({ hex, full = false }: AircraftTraceMechanismRecord = {}) => {
  try {
    const recent = await fetchTrace({ hex, full });
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
  } catch (error: any) {
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
