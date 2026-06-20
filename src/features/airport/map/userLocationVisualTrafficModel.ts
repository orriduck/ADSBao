import { getDistanceNm } from "@/utils/aircraftTrafficIntent";
import { toFiniteNumber } from "@/utils/math";

const DEFAULT_LIMIT = 3;
const VISUAL_TRAFFIC_MAX_DISTANCE_NM = 3;
const VISUAL_TRAFFIC_MAX_ALTITUDE_FT = 10_000;

type UserLocationVisualTrafficRecord = Record<string, any>;

export type UserLocationVisualTrafficItem = {
  aircraftId: string;
  callsign: string;
  distanceNm: number;
  altitudeFt: number;
  bearingDeg: number;
  relativeBearingDeg: number | null;
  relativeSide: "ahead" | "behind" | "left" | "right" | "bearing";
  relativeDegrees: number | null;
  clockHour: number | null;
};

const normalizeDegrees = (degrees: number) => ((degrees % 360) + 360) % 360;

const normalizeHeadingDeg = (value: unknown) => {
  const heading = toFiniteNumber(value);
  if (heading == null || heading < 0) return null;
  return normalizeDegrees(heading);
};

const signedBearingDelta = (fromDeg: number, toDeg: number) => {
  let delta = normalizeDegrees(toDeg) - normalizeDegrees(fromDeg);
  if (delta > 180) delta -= 360;
  if (delta <= -180) delta += 360;
  return delta;
};

const resolveAircraftId = (aircraft: UserLocationVisualTrafficRecord) =>
  String(aircraft?.icao24 || aircraft?.hex || aircraft?.callsign || "");

const resolveCallsign = (aircraft: UserLocationVisualTrafficRecord) =>
  String(
    aircraft?.callsign ||
      aircraft?.registration ||
      aircraft?.icao24 ||
      aircraft?.hex ||
      "",
  ).trim();

const resolveAltitudeFt = (aircraft: UserLocationVisualTrafficRecord) =>
  Math.max(
    0,
    toFiniteNumber(
      aircraft?.altitude ?? aircraft?.alt_baro ?? aircraft?.alt_geom,
    ) ?? 0,
  );

function resolveBearingDeg({
  fromLat,
  fromLon,
  toLat,
  toLon,
}: {
  fromLat: number;
  fromLon: number;
  toLat: number;
  toLon: number;
}) {
  const lat1 = (fromLat * Math.PI) / 180;
  const lat2 = (toLat * Math.PI) / 180;
  const deltaLon = ((toLon - fromLon) * Math.PI) / 180;
  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  return normalizeDegrees((Math.atan2(y, x) * 180) / Math.PI);
}

function resolveRelativeDisplay(relativeBearingDeg: number | null) {
  if (relativeBearingDeg == null) {
    return {
      relativeSide: "bearing" as const,
      relativeDegrees: null,
      clockHour: null,
    };
  }

  const absoluteDegrees = Math.round(Math.abs(relativeBearingDeg));
  const clockHour =
    Math.round(normalizeDegrees(relativeBearingDeg) / 30) % 12 || 12;

  if (absoluteDegrees <= 10) {
    return {
      relativeSide: "ahead" as const,
      relativeDegrees: absoluteDegrees,
      clockHour,
    };
  }

  if (absoluteDegrees >= 170) {
    return {
      relativeSide: "behind" as const,
      relativeDegrees: absoluteDegrees,
      clockHour,
    };
  }

  return {
    relativeSide: relativeBearingDeg > 0 ? ("right" as const) : ("left" as const),
    relativeDegrees: absoluteDegrees,
    clockHour,
  };
}

export function buildUserLocationVisualTraffic({
  userLocation = null,
  aircraft = [],
  limit = DEFAULT_LIMIT,
}: {
  userLocation?: UserLocationVisualTrafficRecord | null;
  aircraft?: UserLocationVisualTrafficRecord[];
  limit?: number;
} = {}): UserLocationVisualTrafficItem[] {
  const userLat = toFiniteNumber(userLocation?.lat);
  const userLon = toFiniteNumber(userLocation?.lon);
  if (userLat == null || userLon == null) return [];

  const userHeadingDeg = normalizeHeadingDeg(userLocation?.headingDeg);
  const maxItems = Math.max(0, Math.floor(Number(limit) || 0));
  if (maxItems === 0) return [];

  return aircraft
    .flatMap((item) => {
      const aircraftLat = toFiniteNumber(item?.lat);
      const aircraftLon = toFiniteNumber(item?.lon);
      if (aircraftLat == null || aircraftLon == null) return [];

      const distanceNm = getDistanceNm(userLat, userLon, aircraftLat, aircraftLon);
      if (distanceNm == null) return [];

      const altitudeFt = resolveAltitudeFt(item);
      if (
        distanceNm > VISUAL_TRAFFIC_MAX_DISTANCE_NM ||
        altitudeFt > VISUAL_TRAFFIC_MAX_ALTITUDE_FT
      ) {
        return [];
      }

      const bearingDeg = resolveBearingDeg({
        fromLat: userLat,
        fromLon: userLon,
        toLat: aircraftLat,
        toLon: aircraftLon,
      });
      const relativeBearingDeg =
        userHeadingDeg == null
          ? null
          : signedBearingDelta(userHeadingDeg, bearingDeg);
      const relative = resolveRelativeDisplay(relativeBearingDeg);

      return [
        {
          aircraftId: resolveAircraftId(item),
          callsign: resolveCallsign(item),
          distanceNm,
          altitudeFt,
          bearingDeg,
          relativeBearingDeg,
          ...relative,
        },
      ];
    })
    .sort((left, right) => left.distanceNm - right.distanceNm)
    .slice(0, maxItems);
}
