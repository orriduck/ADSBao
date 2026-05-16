import { readResponseJson } from "@/services/apiProxySecurity.js";

import {
  METAR_MAX_BYTES,
  METAR_USER_AGENT,
  MetarProviderError,
} from "./metar.models.js";
import { buildMetarUrl } from "./metar.utils.js";

export async function fetchMetar({ icao } = {}) {
  const response = await fetch(buildMetarUrl(icao), {
    headers: {
      Accept: "application/json",
      "User-Agent": METAR_USER_AGENT,
    },
    next: {
      revalidate: 60,
    },
  });

  if (response.status === 204) return [];

  if (!response.ok) {
    throw new MetarProviderError("Failed to load METAR", response.status);
  }

  const payload = await readResponseJson(response, {
    label: "AviationWeather METAR response",
    maxBytes: METAR_MAX_BYTES,
  });

  if (!Array.isArray(payload)) {
    throw new MetarProviderError("Invalid METAR payload", 502);
  }

  return payload;
}
