import { toFiniteNumber } from "../../../utils/math";

export const DEFAULT_TRACKING_CONTEXT_COORDINATE_PRECISION = 1;

type FlightPositionInput = {
  lat?: unknown;
  lon?: unknown;
};

type FlightTrackingContextPositionOptions = FlightPositionInput & {
  precision?: unknown;
};

type FlightTrackingLoadingOverlayOptions = {
  hasActiveFlight?: boolean;
  trackedAircraftSettled?: boolean;
  nearbyAircraftSettled?: boolean;
  nearbyAirportsSettled?: boolean;
  trackedLoadingOverlayActive?: boolean;
  nearbyLoadingOverlayActive?: boolean;
};

export function normalizeLatitude(value: unknown) {
  if (value == null || value === "") return null;
  const coordinate = toFiniteNumber(value);
  return coordinate != null && coordinate >= -90 && coordinate <= 90
    ? coordinate
    : null;
}

export function normalizeLongitude(value: unknown) {
  if (value == null || value === "") return null;
  const coordinate = toFiniteNumber(value);
  return coordinate != null && coordinate >= -180 && coordinate <= 180
    ? coordinate
    : null;
}

export function hasFiniteFlightPosition({ lat, lon }: FlightPositionInput = {}) {
  return normalizeLatitude(lat) != null && normalizeLongitude(lon) != null;
}

export function getFlightTrackingContextPosition({
  lat,
  lon,
  precision = DEFAULT_TRACKING_CONTEXT_COORDINATE_PRECISION,
}: FlightTrackingContextPositionOptions = {}) {
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
}: FlightTrackingLoadingOverlayOptions = {}) {
  return Boolean(
    hasActiveFlight && (!trackedAircraftSettled || trackedLoadingOverlayActive),
  );
}

function roundCoordinate(value: number, precision: unknown) {
  const numericPrecision = Math.max(0, Math.min(6, Number(precision) || 0));
  const factor = 10 ** numericPrecision;
  const rounded = Math.round(value * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}
