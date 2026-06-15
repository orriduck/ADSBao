import { readResponseJson } from "@/server/http/apiProxySecurity";
import {
  buildOpenMeteoCurrentWeatherUrl,
  isValidOpenMeteoCurrentPayload,
} from "./localWeatherProxyModel";

import {
  LOCAL_WEATHER_MAX_BYTES,
  LOCAL_WEATHER_USER_AGENT,
  LocalWeatherProviderError,
} from "./localWeather.models";

async function _fetchOpenMeteo({ latitude, longitude }) {
  const response = await fetch(
    buildOpenMeteoCurrentWeatherUrl({ latitude, longitude }),
    {
      headers: {
        Accept: "application/json",
        "User-Agent": LOCAL_WEATHER_USER_AGENT,
      },
    },
  );

  if (!response.ok) {
    if (response.status === 429) {
      throw new LocalWeatherProviderError(
        "Weather service busy — try again shortly",
        429,
      );
    }
    throw new LocalWeatherProviderError("Failed to load weather", response.status);
  }

  const payload = await readResponseJson(response, {
    label: "Open-Meteo current weather response",
    maxBytes: LOCAL_WEATHER_MAX_BYTES,
  });

  if (!isValidOpenMeteoCurrentPayload(payload)) {
    throw new LocalWeatherProviderError("Invalid weather payload", 502);
  }

  return { payload, status: response.status };
}

const DAY_MS = 86_400_000;
const JITTER_MS = Math.floor(Math.random() * 120_000); // 0–2 min
const localWeatherCache = new Map<
  string,
  { expiresAt: number; promise: Promise<{ payload: unknown; status: number }> }
>();

export function fetchLocalWeather({ latitude, longitude }) {
  // Round coordinates to 2 decimal places (~1.1 km) as cache key —
  // nearby requests share the same cached upstream fetch.
  const lat = Number(latitude.toFixed(2));
  const lon = Number(longitude.toFixed(2));
  const key = `local-weather-${lat}-${lon}`;
  const now = Date.now();
  const cached = localWeatherCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.promise;
  }

  const promise = _fetchOpenMeteo({ latitude: lat, longitude: lon });
  localWeatherCache.set(key, {
    expiresAt: now + DAY_MS + JITTER_MS,
    promise,
  });
  promise.catch(() => {
    if (localWeatherCache.get(key)?.promise === promise) {
      localWeatherCache.delete(key);
    }
  });
  return promise;
}
