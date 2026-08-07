import { AIRCRAFT_TRAFFIC_CONFIG } from "../../../config/aviation";
import {
  NEARBY_AIRPORT_DEFAULTS,
  NEARBY_AIRPORT_LIMITS,
} from "../../airport/nearby/nearbyAirports.models";

const DEFAULT_CONTEXT = Object.freeze({
  aircraftRangeNm: AIRCRAFT_TRAFFIC_CONFIG.rangeNm,
  airportRadiusNm: NEARBY_AIRPORT_DEFAULTS.radiusNm,
  airportLimit: NEARBY_AIRPORT_LIMITS.maxLimit,
  fullTraceForFocal: true,
  showNearbyContext: true,
  showNearbyTrafficContext: true,
  showNearbyAirportContext: true,
  routeEndpointAirportsOnly: false,
  showNearbyMapContext: true,
  zoomDisabled: false,
  mapFitOptions: Object.freeze({
    padding: Object.freeze([60, 60]),
    maxZoom: 14,
  }),
  autoFitSuspendsFollow: false,
});

export function resolveFlightTrackingDisplayContext() {
  return DEFAULT_CONTEXT;
}

export function resolveTrackedAircraftSelectionSync({
  focalKey = "",
  previousFocalKey = "",
  focalCallsignKey = "",
  selectedAircraftId = "",
} = {}) {
  const nextFocalKey = String(focalKey || "").trim();
  const currentSelection = String(selectedAircraftId || "").trim();
  if (!nextFocalKey || !currentSelection || currentSelection === nextFocalKey) {
    return null;
  }

  const previousKey = String(previousFocalKey || "").trim();
  const callsignKey = String(focalCallsignKey || "").trim();
  if (
    (previousKey && currentSelection === previousKey) ||
    (callsignKey && currentSelection === callsignKey)
  ) {
    return nextFocalKey;
  }

  return null;
}
