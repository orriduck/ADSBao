export const NEARBY_EXPLORER_RADIUS_NM = 80;
// Traffic polling and the visible boundary stay at 80 NM. The map itself has
// a little more room to inspect the surrounding area, constrained as a square
// whose sides extend 1.5× that radius from the focal airport.
export const NEARBY_EXPLORER_DRAG_HALF_SIDE_NM =
  NEARBY_EXPLORER_RADIUS_NM * 1.5;

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

export function clampMapCenterToNearbySquare({
  anchor,
  center,
  halfSideNm = NEARBY_EXPLORER_DRAG_HALF_SIDE_NM,
}: {
  anchor: MapCoordinate;
  center: MapCoordinate;
  halfSideNm?: unknown;
}) {
  const focalPoint = coordinate(anchor);
  const requestedCenter = coordinate(center);
  const halfSide = Number(halfSideNm);
  if (!focalPoint || !requestedCenter || !Number.isFinite(halfSide) || halfSide <= 0) {
    return null;
  }

  // At this local scale, a north/east nautical-mile grid gives an intuitive
  // square constraint while retaining correct longitude wrapping at ±180°.
  const latitudeCosine = Math.cos(radians(focalPoint.lat));
  if (Math.abs(latitudeCosine) < 0.000001) return null;
  const northNm = (requestedCenter.lat - focalPoint.lat) * 60;
  const eastNm =
    normalizeLongitude(requestedCenter.lng - focalPoint.lng) * 60 * latitudeCosine;
  const clampedNorthNm = Math.max(-halfSide, Math.min(halfSide, northNm));
  const clampedEastNm = Math.max(-halfSide, Math.min(halfSide, eastNm));
  const corrected = clampedNorthNm !== northNm || clampedEastNm !== eastNm;

  if (!corrected) {
    return { ...requestedCenter, corrected, northNm, eastNm };
  }

  return {
    lat: focalPoint.lat + clampedNorthNm / 60,
    lng: normalizeLongitude(
      focalPoint.lng + clampedEastNm / (60 * latitudeCosine),
    ),
    corrected,
    northNm,
    eastNm,
  };
}
