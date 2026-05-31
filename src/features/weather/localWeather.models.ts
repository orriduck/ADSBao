import { buildAdsbaoUserAgent } from "../../config/siteMeta";

export const LOCAL_WEATHER_USER_AGENT = buildAdsbaoUserAgent();

export const LOCAL_WEATHER_MAX_BYTES = 512 * 1024;

export class LocalWeatherProviderError extends Error {
  status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "LocalWeatherProviderError";
    this.status = status;
  }
}
