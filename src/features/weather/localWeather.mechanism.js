import { readResponseJson } from "../../app/api/_shared/apiProxySecurity.js";
import {
  buildOpenMeteoCurrentWeatherUrl,
  isValidOpenMeteoCurrentPayload,
} from "./localWeatherProxyModel.js";

import {
  LOCAL_WEATHER_MAX_BYTES,
  LOCAL_WEATHER_USER_AGENT,
  LocalWeatherProviderError,
} from "./localWeather.models.js";

export async function fetchLocalWeather({ latitude, longitude } = {}) {
  const response = await fetch(
    buildOpenMeteoCurrentWeatherUrl({ latitude, longitude }),
    {
      headers: {
        Accept: "application/json",
        "User-Agent": LOCAL_WEATHER_USER_AGENT,
      },
      next: {
        revalidate: 300,
      },
    },
  );

  if (!response.ok) {
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
