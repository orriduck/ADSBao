import { getDistanceNm } from "@/utils/aircraftTrafficIntent";
import { USER_LOCATION_AIRCRAFT_ALERT_RANGE_METERS } from "./userLocationAudioModel";

export const USER_LOCATION_MAX_DISTANCE_NM = 80;
export const USER_LOCATION_PULSE_RADIUS_METERS =
  USER_LOCATION_AIRCRAFT_ALERT_RANGE_METERS;
export const USER_LOCATION_MIN_PULSE_DIAMETER_PX = 18;
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

type ResolveNextUserLocationAudioModeOptions = {
  mode?: unknown;
  hasLocation?: boolean;
};

const toFiniteNumber = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export function resolveNextUserLocationAudioMode({
  mode,
  hasLocation = false,
}: ResolveNextUserLocationAudioModeOptions = {}): UserLocationAudioMode {
  if (!hasLocation) return USER_LOCATION_AUDIO_MODES.LOCATION;
  if (mode === USER_LOCATION_AUDIO_MODES.LOCATION) {
    return USER_LOCATION_AUDIO_MODES.LOCATION_AUDIO;
  }
  if (mode === USER_LOCATION_AUDIO_MODES.LOCATION_AUDIO) {
    return USER_LOCATION_AUDIO_MODES.OFF;
  }
  return USER_LOCATION_AUDIO_MODES.LOCATION;
}

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

export function resolveUserLocationRequest({
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
