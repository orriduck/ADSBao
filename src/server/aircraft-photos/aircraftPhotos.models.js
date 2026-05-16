export const AIRCRAFT_PHOTOS_USER_AGENT =
  "ADSBao/0.11.0 (+https://github.com/orriduck/ADSBao)";

export const AIRCRAFT_PHOTO_MAX_BYTES = 256 * 1024;
export const AIRCRAFT_PHOTO_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const AIRCRAFT_PHOTO_SOURCE = "planespotters.net";

export const AIRCRAFT_PHOTO_CACHE_HEADERS = Object.freeze({
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
  "X-Data-Source": AIRCRAFT_PHOTO_SOURCE,
});

export class AircraftPhotoProviderError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = "AircraftPhotoProviderError";
    this.status = status;
  }
}
