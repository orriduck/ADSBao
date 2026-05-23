import { buildAdsbaoUserAgent } from "../../../config/siteMeta.js";

export const METAR_USER_AGENT = buildAdsbaoUserAgent();

export const METAR_MAX_BYTES = 512 * 1024;

export const METAR_CACHE_HEADERS = Object.freeze({
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
});

export class MetarProviderError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = "MetarProviderError";
    this.status = status;
  }
}
