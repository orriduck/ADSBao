import { buildAdsbaoUserAgent } from "../../../config/siteMeta";

export const AIRCRAFT_PHOTOS_USER_AGENT = buildAdsbaoUserAgent();

export const AIRCRAFT_PHOTO_MAX_BYTES = 256 * 1024;
export const AIRCRAFT_PHOTO_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const AIRCRAFT_PHOTO_SOURCE = "planespotters.net";

export const AIRCRAFT_PHOTO_CACHE_HEADERS = Object.freeze({
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
  "X-Data-Source": AIRCRAFT_PHOTO_SOURCE,
});

export class AircraftPhotoProviderError extends Error {
  status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "AircraftPhotoProviderError";
    this.status = status;
  }
}
