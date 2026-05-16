export const LOCAL_WEATHER_USER_AGENT =
  "ADSBao/0.10.0 (https://github.com/orriduck/ADSBao)";

export const LOCAL_WEATHER_MAX_BYTES = 512 * 1024;

export class LocalWeatherProviderError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = "LocalWeatherProviderError";
    this.status = status;
  }
}
