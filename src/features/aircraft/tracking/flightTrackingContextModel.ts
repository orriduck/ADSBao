import { toFiniteNumber } from "../../../utils/math";

export const DEFAULT_TRACKING_CONTEXT_COORDINATE_PRECISION = 1;

export function normalizeLatitude(value) {
  if (value == null || value === "") return null;
  const coordinate = toFiniteNumber(value);
  return coordinate != null && coordinate >= -90 && coordinate <= 90
    ? coordinate
    : null;
}

export function normalizeLongitude(value) {
  if (value == null || value === "") return null;
  const coordinate = toFiniteNumber(value);
  return coordinate != null && coordinate >= -180 && coordinate <= 180
    ? coordinate
    : null;
}

export function hasFiniteFlightPosition({ lat, lon } = {}) {
  return normalizeLatitude(lat) != null && normalizeLongitude(lon) != null;
}

export function getFlightTrackingContextPosition({
  lat,
  lon,
  precision = DEFAULT_TRACKING_CONTEXT_COORDINATE_PRECISION,
} = {}) {
  const normalizedLat = normalizeLatitude(lat);
  const normalizedLon = normalizeLongitude(lon);
  if (normalizedLat == null || normalizedLon == null) return null;

  return {
    lat: roundCoordinate(normalizedLat, precision),
    lon: roundCoordinate(normalizedLon, precision),
  };
}

export function shouldShowFlightTrackingLoadingOverlay({
  hasActiveFlight = false,
  trackedAircraftSettled = false,
  trackedLoadingOverlayActive = false,
} = {}) {
  return Boolean(
    hasActiveFlight && (!trackedAircraftSettled || trackedLoadingOverlayActive),
  );
}

function roundCoordinate(value, precision) {
  const numericPrecision = Math.max(0, Math.min(6, Number(precision) || 0));
  const factor = 10 ** numericPrecision;
  const rounded = Math.round(value * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}
