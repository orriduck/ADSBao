import {
  isFlightAwareFallbackTracking,
} from "./flightAwareFallbackTrackingModel";
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

const FLIGHTAWARE_DESKTOP_CONTEXT = Object.freeze({
  aircraftRangeNm: 100,
  airportRadiusNm: NEARBY_AIRPORT_DEFAULTS.radiusNm,
  airportLimit: NEARBY_AIRPORT_LIMITS.maxLimit,
  fullTraceForFocal: true,
  showNearbyContext: true,
  showNearbyTrafficContext: false,
  showNearbyAirportContext: false,
  routeEndpointAirportsOnly: true,
  showNearbyMapContext: false,
  zoomDisabled: true,
  mapFitOptions: Object.freeze({
    padding: Object.freeze([84, 84]),
    maxZoom: 8,
  }),
  autoFitSuspendsFollow: true,
});

const FLIGHTAWARE_MOBILE_CONTEXT = Object.freeze({
  ...FLIGHTAWARE_DESKTOP_CONTEXT,
  mapFitOptions: Object.freeze({
    paddingTopLeft: Object.freeze([34, 72]),
    paddingBottomRight: Object.freeze([34, 72]),
    maxZoom: 7,
  }),
});

export function resolveFlightTrackingDisplayContext({
  trackingState = null,
  isMobile = false,
} = {}) {
  if (!isFlightAwareFallbackTracking(trackingState)) {
    return DEFAULT_CONTEXT;
  }

  return isMobile ? FLIGHTAWARE_MOBILE_CONTEXT : FLIGHTAWARE_DESKTOP_CONTEXT;
}
