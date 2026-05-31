import { readResponseJson } from "../../../app/api/_shared/apiProxySecurity";

import {
  AIRCRAFT_PHOTO_IMAGE_MAX_BYTES,
  AIRCRAFT_PHOTO_MAX_BYTES,
  AIRCRAFT_PHOTO_SOURCE,
  AIRCRAFT_PHOTOS_USER_AGENT,
  AircraftPhotoProviderError,
} from "./aircraftPhotos.models";

function buildPhotoUrl({ hex, registration, type }) {
  const url = new URL(
    `https://api.planespotters.net/pub/photos/hex/${encodeURIComponent(hex)}`,
  );
  if (registration) url.searchParams.set("reg", registration);
  if (type) url.searchParams.set("icaoType", type);
  return url;
}

function buildImageProxyUrl({ hex, origin, registration, type }) {
  const url = new URL(
    `/api/proxy/aircraft/photos/${encodeURIComponent(hex)}/image`,
    origin,
  );
  if (registration) url.searchParams.set("registration", registration);
  if (type) url.searchParams.set("type", type);
  return `${url.pathname}${url.search}`;
}

function selectPhoto({ payload, hex, origin, registration, type }) {
  const [photo] = Array.isArray(payload?.photos) ? payload.photos : [];
  const image = photo?.thumbnail_large || photo?.thumbnail;
  const src = typeof image?.src === "string" ? image.src : "";
  if (!src) return null;

  return {
    src: buildImageProxyUrl({ hex, origin, registration, type }),
    originalSrc: src,
    width: Number(image?.size?.width) || null,
    height: Number(image?.size?.height) || null,
    link: typeof photo?.link === "string" ? photo.link : "",
    photographer:
      typeof photo?.photographer === "string" ? photo.photographer : "",
    source: AIRCRAFT_PHOTO_SOURCE,
  };
}

function selectImageUrl(payload) {
  const [photo] = Array.isArray(payload?.photos) ? payload.photos : [];
  return (
    (typeof photo?.thumbnail_large?.src === "string" &&
      photo.thumbnail_large.src) ||
    (typeof photo?.thumbnail?.src === "string" && photo.thumbnail.src) ||
    ""
  );
}

async function fetchPhotoPayload({ hex, registration, type }) {
  let response;
  try {
    response = await fetch(buildPhotoUrl({ hex, registration, type }), {
      headers: {
        Accept: "application/json",
        "User-Agent": AIRCRAFT_PHOTOS_USER_AGENT,
      },
      next: { revalidate: 3600 },
    });
  } catch (networkError) {
    throw new AircraftPhotoProviderError(`network: ${networkError.message}`);
  }

  if (!response.ok) {
    throw new AircraftPhotoProviderError(`HTTP ${response.status}`, response.status);
  }

  return readResponseJson(response, {
    label: `${AIRCRAFT_PHOTO_SOURCE} aircraft photo response`,
    maxBytes: AIRCRAFT_PHOTO_MAX_BYTES,
  });
}

export async function getAircraftPhoto({ hex, origin, registration, type } = {}) {
  const payload = await fetchPhotoPayload({ hex, registration, type });
  return selectPhoto({ payload, hex, origin, registration, type });
}

export async function getAircraftPhotoImage({ hex, registration, type } = {}) {
  const payload = await fetchPhotoPayload({ hex, registration, type });
  const imageUrl = selectImageUrl(payload);
  if (!imageUrl) return null;

  const response = await fetch(imageUrl, {
    headers: {
      Accept: "image/avif,image/webp,image/jpeg,image/*",
      "User-Agent": AIRCRAFT_PHOTOS_USER_AGENT,
    },
    next: { revalidate: 3600 },
  });
  if (!response.ok) {
    throw new AircraftPhotoProviderError(`HTTP ${response.status}`, response.status);
  }

  const contentLength = Number(response.headers.get("content-length"));
  if (
    Number.isFinite(contentLength) &&
    contentLength > AIRCRAFT_PHOTO_IMAGE_MAX_BYTES
  ) {
    throw new AircraftPhotoProviderError("photo image exceeded byte limit");
  }
  const contentType = response.headers.get("content-type") || "image/jpeg";
  if (!contentType.startsWith("image/")) {
    throw new AircraftPhotoProviderError("photo response was not an image");
  }
  return { body: response.body, contentType };
}
