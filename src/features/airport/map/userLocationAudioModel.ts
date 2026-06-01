import { getDistanceNm } from "@/utils/aircraftTrafficIntent";
import { toFiniteNumber } from "@/utils/math";

export const USER_LOCATION_AIRCRAFT_ALERT_RANGE_NM = 6;
export const USER_LOCATION_AIRCRAFT_ALERT_RANGE_METERS =
  USER_LOCATION_AIRCRAFT_ALERT_RANGE_NM * 1852;
export const USER_LOCATION_AIRCRAFT_MIN_INTERVAL_MS = 360;
export const USER_LOCATION_AIRCRAFT_MAX_INTERVAL_MS = 2400;
export const USER_LOCATION_AIRCRAFT_MIN_TONE_HZ = 620;
export const USER_LOCATION_AIRCRAFT_MAX_TONE_HZ = 1120;

const FEET_PER_NAUTICAL_MILE = 6076.12;

type UserLocationAudioRecord = Record<string, any>;
export type UserLocationAircraftAudioCue = {
  aircraftId: string;
  callsign: string;
  distanceNm: number;
  intervalMs: number;
  toneHz: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const resolveAircraftId = (aircraft: UserLocationAudioRecord) =>
  aircraft?.icao24 || aircraft?.hex || aircraft?.callsign || "";

function resolveAltitudeNm(aircraft: UserLocationAudioRecord) {
  const altitude = toFiniteNumber(aircraft?.altitude ?? aircraft?.alt_baro);
  if (altitude == null || altitude <= 0) return 0;
  return altitude / FEET_PER_NAUTICAL_MILE;
}

function resolveAircraftDistanceNm({
  userLocation,
  aircraft,
}: {
  userLocation?: UserLocationAudioRecord | null;
  aircraft?: UserLocationAudioRecord | null;
}) {
  const horizontalDistanceNm = getDistanceNm(
    userLocation?.lat,
    userLocation?.lon,
    aircraft?.lat,
    aircraft?.lon,
  );
  if (horizontalDistanceNm == null) return null;

  const verticalDistanceNm = resolveAltitudeNm(aircraft || {});
  return Math.hypot(horizontalDistanceNm, verticalDistanceNm);
}

export function buildAircraftProximityAudioCue({
  userLocation,
  aircraft = [],
  alertRangeNm = USER_LOCATION_AIRCRAFT_ALERT_RANGE_NM,
}: {
  userLocation?: UserLocationAudioRecord | null;
  aircraft?: UserLocationAudioRecord[];
  alertRangeNm?: number;
} = {}): UserLocationAircraftAudioCue | null {
  if (!userLocation) return null;

  const nearest = aircraft.reduce(
    (best, item) => {
      if (!item || item.onGround) return best;

      const distanceNm = resolveAircraftDistanceNm({ userLocation, aircraft: item });
      if (distanceNm == null || distanceNm > alertRangeNm) return best;
      if (best && best.distanceNm <= distanceNm) return best;

      return {
        aircraftId: resolveAircraftId(item),
        callsign: item.callsign || "",
        distanceNm,
      };
    },
    null as null | {
      aircraftId: string;
      callsign: string;
      distanceNm: number;
    },
  );

  if (!nearest) return null;

  const proximity = 1 - clamp(nearest.distanceNm / alertRangeNm, 0, 1);
  const intervalMs = Math.round(
    USER_LOCATION_AIRCRAFT_MAX_INTERVAL_MS -
      proximity *
        (USER_LOCATION_AIRCRAFT_MAX_INTERVAL_MS -
          USER_LOCATION_AIRCRAFT_MIN_INTERVAL_MS),
  );
  const toneHz = Math.round(
    USER_LOCATION_AIRCRAFT_MIN_TONE_HZ +
      proximity *
        (USER_LOCATION_AIRCRAFT_MAX_TONE_HZ -
          USER_LOCATION_AIRCRAFT_MIN_TONE_HZ),
  );

  return {
    aircraftId: nearest.aircraftId,
    callsign: nearest.callsign,
    distanceNm: nearest.distanceNm,
    intervalMs,
    toneHz,
  };
}
