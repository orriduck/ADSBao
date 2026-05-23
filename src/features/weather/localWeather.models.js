import { buildAdsbaoUserAgent } from "../../config/siteMeta.js";

export const LOCAL_WEATHER_USER_AGENT = buildAdsbaoUserAgent();

export const LOCAL_WEATHER_MAX_BYTES = 512 * 1024;

export class LocalWeatherProviderError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = "LocalWeatherProviderError";
    this.status = status;
  }
}
