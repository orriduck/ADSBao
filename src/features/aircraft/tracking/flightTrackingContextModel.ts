import { toFiniteNumber } from "../../../utils/math";

const DEFAULT_TRACKING_CONTEXT_COORDINATE_PRECISION = 1;

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
  hasFocalPosition?: boolean;
};

/** Reason shown on the flight map's terminal (no-live-position) card. */
export type FlightTerminalReason = "terminal" | "lost" | "missing";

/** The three lifecycle states the flight map can be in. */
export type FlightFocalLifecycle = "loading" | "position" | "terminal";

type FlightTerminalReasonOptions = {
  lostSignal?: boolean;
  trackingStatus?: string;
};

type FlightFocalLifecycleOptions = {
  hasActiveFlight?: boolean;
  // "resolved" = the realtime feed settled OR the loading grace timed out. Once
  // resolved, a flight with no focal position is terminal (not an endless spinner).
  resolved?: boolean;
  hasFocalPosition?: boolean;
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

// Map the tracked-flight signal onto the copy shown on the terminal card.
// - flightaware_terminal → the flight ended (landed / arrived / cancelled)
// - lostSignal / stale     → we had it but the live signal dropped
// - everything else        → no live position at all
export function resolveFlightTerminalReason({
  lostSignal = false,
  trackingStatus = "",
}: FlightTerminalReasonOptions = {}): FlightTerminalReason {
  const status = String(trackingStatus || "")
    .trim()
    .toLowerCase();
  if (status === "flightaware_terminal") return "terminal";
  if (lostSignal || status === "stale") return "lost";
  return "missing";
}

// Single source of truth for what the flight map shows. Once the feed has
// RESOLVED (settled, or the loading grace timed out — some flights, e.g. a
// trans-oceanic leg with no ADS-B and no FlightAware, never settle), a flight
// with no plottable focal position is a TERMINAL state (a static card) — never
// an indefinite spinner and never the fallback center.
export function resolveFlightFocalLifecycle({
  hasActiveFlight = false,
  resolved = false,
  hasFocalPosition = false,
}: FlightFocalLifecycleOptions = {}): FlightFocalLifecycle {
  if (!hasActiveFlight) return "loading";
  if (hasFocalPosition) return "position";
  if (resolved) return "terminal";
  return "loading";
}

export function shouldShowFlightTrackingLoadingOverlay({
  hasActiveFlight = false,
  trackedAircraftSettled = false,
  hasFocalPosition = true,
}: FlightTrackingLoadingOverlayOptions = {}) {
  if (!hasActiveFlight) return false;
  return (
    resolveFlightFocalLifecycle({
      hasActiveFlight,
      resolved: trackedAircraftSettled,
      hasFocalPosition,
    }) === "loading"
  );
}

function roundCoordinate(value: number, precision: unknown) {
  const numericPrecision = Math.max(0, Math.min(6, Number(precision) || 0));
  const factor = 10 ** numericPrecision;
  const rounded = Math.round(value * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}
