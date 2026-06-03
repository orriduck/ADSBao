import { getDistanceNm } from "@/utils/aircraftTrafficIntent";
import { USER_LOCATION_AIRCRAFT_ALERT_RANGE_METERS } from "./userLocationAudioModel";

const USER_LOCATION_MAX_DISTANCE_NM = 80;
export const USER_LOCATION_PULSE_RADIUS_METERS =
  USER_LOCATION_AIRCRAFT_ALERT_RANGE_METERS;
const USER_LOCATION_MIN_PULSE_DIAMETER_PX = 18;
export const USER_LOCATION_AUDIO_MODES = {
  OFF: "off",
  LOCATION: "location",
  LOCATION_AUDIO: "location-audio",
} as const;

export type UserLocationAudioMode =
  (typeof USER_LOCATION_AUDIO_MODES)[keyof typeof USER_LOCATION_AUDIO_MODES];

type UserLocationCoords = {
  latitude?: unknown;
  longitude?: unknown;
  accuracy?: unknown;
};

type ResolveUserLocationRequestOptions = {
  coords?: UserLocationCoords | null;
  focalLat?: unknown;
  focalLon?: unknown;
  maxDistanceNm?: number;
};

type ResolveUserLocationWatchUpdateOptions =
  ResolveUserLocationRequestOptions & {
    currentMode?: UserLocationAudioMode;
  };

const toFiniteNumber = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export function resolveUserLocationPulseDiameterPx({
  centerPoint,
  radiusPoint,
}: {
  centerPoint?: { x?: unknown; y?: unknown } | null;
  radiusPoint?: { x?: unknown; y?: unknown } | null;
}) {
  const centerX = toFiniteNumber(centerPoint?.x);
  const centerY = toFiniteNumber(centerPoint?.y);
  const radiusX = toFiniteNumber(radiusPoint?.x);
  const radiusY = toFiniteNumber(radiusPoint?.y);
  if (
    centerX == null ||
    centerY == null ||
    radiusX == null ||
    radiusY == null
  ) {
    return USER_LOCATION_MIN_PULSE_DIAMETER_PX;
  }

  const radiusPx = Math.hypot(radiusX - centerX, radiusY - centerY);
  return Math.max(
    USER_LOCATION_MIN_PULSE_DIAMETER_PX,
    Math.round(radiusPx * 2),
  );
}

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
  currentMode = USER_LOCATION_AUDIO_MODES.LOCATION,
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
      mode: USER_LOCATION_AUDIO_MODES.OFF,
      noticeKey: "unavailable",
    };
  }

  if (result.tooFar) {
    return {
      location: null,
      mode: USER_LOCATION_AUDIO_MODES.OFF,
      noticeKey: "tooFar",
    };
  }

  return {
    location: result.location,
    mode:
      currentMode === USER_LOCATION_AUDIO_MODES.LOCATION_AUDIO
        ? USER_LOCATION_AUDIO_MODES.LOCATION_AUDIO
        : USER_LOCATION_AUDIO_MODES.LOCATION,
    noticeKey: "",
  };
}
