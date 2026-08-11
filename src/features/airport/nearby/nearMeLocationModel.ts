import { getDistanceNm } from "@/utils/aircraftTrafficIntent";
import {
  normalizeDegrees,
  normalizeHeadingDeg,
  toFiniteNumber,
} from "@/utils/math";

const NEAR_ME_POSITION_REFRESH_THRESHOLD_NM = 0.05;
const NEAR_ME_SIDEBAR_REFRESH_THRESHOLD_NM =
  NEAR_ME_POSITION_REFRESH_THRESHOLD_NM;
const EARTH_RADIUS_METERS = 6_371_000;

export type NearMeLocation = {
  lat: number;
  lon: number;
  accuracyMeters: number | null;
  headingDeg: number | null;
  // The user's own GPS-reported motion, surfaced by here mode. Speed is in
  // metres/second and altitude in metres above the ellipsoid; both are null on
  // devices/fixes that don't report them (common indoors and on desktop).
  speedMps: number | null;
  altitudeMeters: number | null;
  updatedAt: number;
};

type NearMeCoords = {
  latitude?: unknown;
  longitude?: unknown;
  accuracy?: unknown;
  heading?: unknown;
  speed?: unknown;
  altitude?: unknown;
};

type NearMeDeviceOrientationEvent = {
  absolute?: unknown;
  alpha?: unknown;
  webkitCompassHeading?: unknown;
};

type ShouldUpdateNearMeLocationOptions = {
  positionThresholdNm?: number;
};

export const normalizeNearMeHeadingDeg = normalizeHeadingDeg;

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

  const speedMps = toFiniteNumber(coords?.speed);

  return {
    lat,
    lon,
    accuracyMeters: toFiniteNumber(coords?.accuracy),
    headingDeg: normalizeNearMeHeadingDeg(coords?.heading),
    // Geolocation speed is non-negative when present; treat a negative reading
    // as "no fix" so a stationary phone never shows a bogus speed.
    speedMps: speedMps != null && speedMps >= 0 ? speedMps : null,
    altitudeMeters: toFiniteNumber(coords?.altitude),
    updatedAt,
  };
}

export function shouldUpdateNearMeLocation(
  previous: NearMeLocation | null,
  next: NearMeLocation,
) {
  if (!previous) return true;

  if (previous.lat !== next.lat || previous.lon !== next.lon) return true;
  if (previous.accuracyMeters !== next.accuracyMeters) return true;
  // Refresh on a whole-unit speed change so the here-mode readout stays live
  // even when the user is moving in place (e.g. slowing to a stop) without
  // crossing the position threshold.
  if (Math.round(previous.speedMps ?? -1) !== Math.round(next.speedMps ?? -1)) {
    return true;
  }

  if (previous.headingDeg == null) return next.headingDeg != null;
  if (next.headingDeg == null) return false;

  return normalizeDegrees(previous.headingDeg) !== normalizeDegrees(next.headingDeg);
}

export function shouldRefreshNearMeSidebarLocation(
  previous: NearMeLocation | null,
  next: NearMeLocation,
  {
    positionThresholdNm = NEAR_ME_SIDEBAR_REFRESH_THRESHOLD_NM,
  }: ShouldUpdateNearMeLocationOptions = {},
) {
  if (!previous) return true;

  const distance = getDistanceNm(previous.lat, previous.lon, next.lat, next.lon);
  if (distance == null) return true;

  return distance >= Math.max(0, positionThresholdNm);
}

export function advanceNearMeDebugLocation(
  location: NearMeLocation,
  {
    headingDeg = location.headingDeg ?? 90,
    speedKph = 60,
    elapsedMs = 1_000,
  }: {
    headingDeg?: number;
    speedKph?: number;
    elapsedMs?: number;
  } = {},
): NearMeLocation {
  const safeSpeedKph = Math.max(0, Number(speedKph) || 0);
  const safeElapsedMs = Math.max(0, Number(elapsedMs) || 0);
  const normalizedHeading = normalizeNearMeHeadingDeg(headingDeg) ?? 0;
  const distanceMeters = (safeSpeedKph / 3.6) * (safeElapsedMs / 1_000);
  const angularDistance = distanceMeters / EARTH_RADIUS_METERS;
  const bearingRadians = (normalizedHeading * Math.PI) / 180;
  const latitudeRadians = (location.lat * Math.PI) / 180;
  const longitudeRadians = (location.lon * Math.PI) / 180;
  const nextLatitudeRadians = Math.asin(
    Math.sin(latitudeRadians) * Math.cos(angularDistance) +
      Math.cos(latitudeRadians) *
        Math.sin(angularDistance) *
        Math.cos(bearingRadians),
  );
  const nextLongitudeRadians =
    longitudeRadians +
    Math.atan2(
      Math.sin(bearingRadians) *
        Math.sin(angularDistance) *
        Math.cos(latitudeRadians),
      Math.cos(angularDistance) -
        Math.sin(latitudeRadians) * Math.sin(nextLatitudeRadians),
    );

  return {
    ...location,
    lat: (nextLatitudeRadians * 180) / Math.PI,
    lon: normalizeDegrees((nextLongitudeRadians * 180) / Math.PI + 180) - 180,
    headingDeg: normalizedHeading,
    speedMps: safeSpeedKph / 3.6,
    updatedAt: location.updatedAt + safeElapsedMs,
  };
}
