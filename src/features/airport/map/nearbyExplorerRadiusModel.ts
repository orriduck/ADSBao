export const NEARBY_EXPLORER_RADIUS_NM = 80;

const EARTH_RADIUS_NM = 3440.065;

type MapCoordinate = {
  lat?: unknown;
  lng?: unknown;
  lon?: unknown;
};

function finiteCoordinate(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function radians(value: number) {
  return (value * Math.PI) / 180;
}

function degrees(value: number) {
  return (value * 180) / Math.PI;
}

function normalizeLongitude(value: number) {
  return ((value + 540) % 360) - 180;
}

function coordinate(value: MapCoordinate = {}) {
  const lat = finiteCoordinate(value.lat);
  const lng = finiteCoordinate(value.lng ?? value.lon);
  return lat == null || lng == null ? null : { lat, lng };
}

export function getMapDistanceNm(from: MapCoordinate, to: MapCoordinate) {
  const start = coordinate(from);
  const end = coordinate(to);
  if (!start || !end) return null;

  const deltaLat = radians(end.lat - start.lat);
  const deltaLng = radians(end.lng - start.lng);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(radians(start.lat)) *
      Math.cos(radians(end.lat)) *
      Math.sin(deltaLng / 2) ** 2;
  return 2 * EARTH_RADIUS_NM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function resolveViewportSafeCenterRadiusNm({
  center,
  corners = [],
  radiusNm = NEARBY_EXPLORER_RADIUS_NM,
}: {
  center: MapCoordinate;
  corners?: MapCoordinate[];
  radiusNm?: unknown;
}) {
  const mapCenter = coordinate(center);
  const radius = Number(radiusNm);
  if (!mapCenter || !Number.isFinite(radius) || radius <= 0) return 0;

  const viewportRadiusNm = corners.reduce((furthest, corner) => {
    const distance = getMapDistanceNm(mapCenter, corner);
    return distance == null ? furthest : Math.max(furthest, distance);
  }, 0);
  return Math.max(0, radius - viewportRadiusNm);
}

function initialBearingDeg(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const deltaLng = radians(to.lng - from.lng);
  const y = Math.sin(deltaLng) * Math.cos(radians(to.lat));
  const x =
    Math.cos(radians(from.lat)) * Math.sin(radians(to.lat)) -
    Math.sin(radians(from.lat)) *
      Math.cos(radians(to.lat)) *
      Math.cos(deltaLng);
  return (degrees(Math.atan2(y, x)) + 360) % 360;
}

function destinationPoint(
  from: { lat: number; lng: number },
  bearingDeg: number,
  distanceNm: number,
) {
  const angularDistance = distanceNm / EARTH_RADIUS_NM;
  const bearing = radians(bearingDeg);
  const startLat = radians(from.lat);
  const startLng = radians(from.lng);
  const endLat = Math.asin(
    Math.sin(startLat) * Math.cos(angularDistance) +
      Math.cos(startLat) * Math.sin(angularDistance) * Math.cos(bearing),
  );
  const endLng =
    startLng +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(startLat),
      Math.cos(angularDistance) - Math.sin(startLat) * Math.sin(endLat),
    );
  return { lat: degrees(endLat), lng: normalizeLongitude(degrees(endLng)) };
}

export function clampMapCenterToNearbyRadius({
  anchor,
  center,
  radiusNm = NEARBY_EXPLORER_RADIUS_NM,
}: {
  anchor: MapCoordinate;
  center: MapCoordinate;
  radiusNm?: unknown;
}) {
  const focalPoint = coordinate(anchor);
  const requestedCenter = coordinate(center);
  const radius = Number(radiusNm);
  if (!focalPoint || !requestedCenter || !Number.isFinite(radius) || radius <= 0) {
    return null;
  }

  const distanceNm = getMapDistanceNm(focalPoint, requestedCenter);
  if (distanceNm == null || distanceNm <= radius) {
    return { ...requestedCenter, corrected: false, distanceNm };
  }

  return {
    ...destinationPoint(focalPoint, initialBearingDeg(focalPoint, requestedCenter), radius),
    corrected: true,
    distanceNm,
  };
}
