// Bounding box for the "free pan" zone the user is allowed to roam in
// while at airport zoom. Picked to roughly match approach-airspace
// scale (~30nm radius from the airport) so the user can wander out
// past the runway threshold but not lose the airport entirely.
//
// Returns a Leaflet-shaped `[[s,w],[n,e]]` tuple. Pure / framework-
// free so tests don't need to touch Leaflet.

const NM_PER_DEGREE_LAT = 60;

export const APPROACH_PAN_RADIUS_NM = 30;

export type LatLngBounds = [[number, number], [number, number]];

export function computeApproachPanBounds(
  lat: number,
  lon: number,
  radiusNm: number = APPROACH_PAN_RADIUS_NM,
): LatLngBounds | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (!Number.isFinite(radiusNm) || radiusNm <= 0) return null;

  const latDelta = radiusNm / NM_PER_DEGREE_LAT;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  // Near the poles cos(lat) approaches 0 — fall back to a very wide
  // longitudinal box so the user can still pan. Sub-equatorial airports
  // are nowhere near this case in practice but the guard is cheap.
  const safeCosLat = Math.max(Math.abs(cosLat), 0.05);
  const lonDelta = latDelta / safeCosLat;

  return [
    [lat - latDelta, lon - lonDelta],
    [lat + latDelta, lon + lonDelta],
  ];
}
