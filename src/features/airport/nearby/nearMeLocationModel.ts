import { getDistanceNm } from "@/utils/aircraftTrafficIntent";
import { toFiniteNumber } from "@/utils/math";

export const NEAR_ME_POSITION_REFRESH_THRESHOLD_NM = 0.05;

export type NearMeLocation = {
  lat: number;
  lon: number;
  accuracyMeters: number | null;
  headingDeg: number | null;
  updatedAt: number;
};

type NearMeCoords = {
  latitude?: unknown;
  longitude?: unknown;
  accuracy?: unknown;
  heading?: unknown;
};

type NearMeDeviceOrientationEvent = {
  absolute?: unknown;
  alpha?: unknown;
  webkitCompassHeading?: unknown;
};

type ShouldUpdateNearMeLocationOptions = {
  positionThresholdNm?: number;
};

const normalizeDegrees = (degrees: number) => ((degrees % 360) + 360) % 360;

export const normalizeNearMeHeadingDeg = (value: unknown) => {
  const heading = toFiniteNumber(value);
  if (heading == null || heading < 0) return null;
  return normalizeDegrees(heading);
};

export function resolveNearMeDeviceHeading(
  event?: NearMeDeviceOrientationEvent | null,
) {
  const webkitCompassHeading = normalizeNearMeHeadingDeg(
    event?.webkitCompassHeading,
  );
  if (webkitCompassHeading != null) return webkitCompassHeading;

  if (event?.absolute !== true) return null;

  const alpha = toFiniteNumber(event?.alpha);
  if (alpha == null) return null;
  return normalizeDegrees(360 - alpha);
}

export async function requestNearMeDeviceOrientationPermission() {
  if (typeof window === "undefined") return "unavailable" as const;

  const DeviceOrientationEventWithPermission = window.DeviceOrientationEvent as
    | (typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<PermissionState>;
      })
    | undefined;
  if (!DeviceOrientationEventWithPermission) return "unavailable" as const;
  if (typeof DeviceOrientationEventWithPermission.requestPermission !== "function") {
    return "granted" as const;
  }

  try {
    return await DeviceOrientationEventWithPermission.requestPermission();
  } catch {
    return "denied" as const;
  }
}

export function buildNearMeLocationFromCoords(
  coords?: NearMeCoords | null,
  updatedAt = Date.now(),
): NearMeLocation | null {
  const lat = toFiniteNumber(coords?.latitude);
  const lon = toFiniteNumber(coords?.longitude);
  if (lat == null || lon == null) return null;

  return {
    lat,
    lon,
    accuracyMeters: toFiniteNumber(coords?.accuracy),
    headingDeg: normalizeNearMeHeadingDeg(coords?.heading),
    updatedAt,
  };
}

export function shouldUpdateNearMeLocation(
  previous: NearMeLocation | null,
  next: NearMeLocation,
  {
    positionThresholdNm = NEAR_ME_POSITION_REFRESH_THRESHOLD_NM,
  }: ShouldUpdateNearMeLocationOptions = {},
) {
  if (!previous) return true;

  const distance = getDistanceNm(previous.lat, previous.lon, next.lat, next.lon);
  if (distance == null || distance >= positionThresholdNm) return true;

  if (previous.headingDeg == null) return next.headingDeg != null;
  if (next.headingDeg == null) return false;

  return normalizeDegrees(previous.headingDeg) !== normalizeDegrees(next.headingDeg);
}
