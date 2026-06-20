import { getDistanceNm } from "@/utils/aircraftTrafficIntent";

const USER_LOCATION_MAX_DISTANCE_NM = 80;
export const USER_LOCATION_MODES = {
  OFF: "off",
  LOCATION: "location",
} as const;

export type UserLocationMode =
  (typeof USER_LOCATION_MODES)[keyof typeof USER_LOCATION_MODES];

type UserLocationCoords = {
  latitude?: unknown;
  longitude?: unknown;
  accuracy?: unknown;
  heading?: unknown;
};

export type UserLocationRecord = {
  lat: number;
  lon: number;
  accuracyMeters: number | null;
  headingDeg: number | null;
  updatedAt: number;
};

type ResolveUserLocationRequestOptions = {
  coords?: UserLocationCoords | null;
  focalLat?: unknown;
  focalLon?: unknown;
  maxDistanceNm?: number;
};

type ResolveUserLocationWatchUpdateOptions =
  ResolveUserLocationRequestOptions;

const toFiniteNumber = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizeHeadingDeg = (value: unknown) => {
  const heading = toFiniteNumber(value);
  if (heading == null || heading < 0) return null;
  return ((heading % 360) + 360) % 360;
};

function resolveUserLocationRequest({
  coords,
  focalLat,
  focalLon,
  maxDistanceNm = USER_LOCATION_MAX_DISTANCE_NM,
}: ResolveUserLocationRequestOptions) {
  const lat = toFiniteNumber(coords?.latitude);
  const lon = toFiniteNumber(coords?.longitude);
  if (lat == null || lon == null) {
    return {
      location: null,
      distanceNm: null,
      tooFar: false,
    };
  }

  const accuracy = toFiniteNumber(coords?.accuracy);
  const distanceNm = getDistanceNm(lat, lon, focalLat, focalLon);

  return {
    location: {
      lat,
      lon,
      accuracyMeters: accuracy,
      headingDeg: normalizeHeadingDeg(coords?.heading),
      updatedAt: Date.now(),
    },
    distanceNm,
    tooFar:
      distanceNm != null &&
      Number.isFinite(distanceNm) &&
      distanceNm > maxDistanceNm,
  };
}

export function resolveUserLocationWatchUpdate({
  coords,
  focalLat,
  focalLon,
  maxDistanceNm,
}: ResolveUserLocationWatchUpdateOptions) {
  const result = resolveUserLocationRequest({
    coords,
    focalLat,
    focalLon,
    maxDistanceNm,
  });

  if (!result.location) {
    return {
      location: null,
      mode: USER_LOCATION_MODES.OFF,
      noticeKey: "unavailable",
      locationEnabled: false,
    };
  }

  if (result.tooFar) {
    return {
      location: null,
      mode: USER_LOCATION_MODES.LOCATION,
      noticeKey: "tooFar",
      locationEnabled: true,
    };
  }

  return {
    location: result.location,
    mode: USER_LOCATION_MODES.LOCATION,
    noticeKey: "",
    locationEnabled: true,
  };
}

export function mergeUserLocationHeading(
  location: UserLocationRecord | null,
  headingDeg: unknown,
  updatedAt = Date.now(),
) {
  const normalizedHeadingDeg = normalizeHeadingDeg(headingDeg);
  if (!location || normalizedHeadingDeg == null) return location;
  if (location.headingDeg === normalizedHeadingDeg) return location;

  return {
    ...location,
    headingDeg: normalizedHeadingDeg,
    updatedAt,
  };
}
