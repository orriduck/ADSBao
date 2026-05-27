import {
  isFlightAwareFallbackTracking,
} from "./flightAwareFallbackTrackingModel.js";

const DEFAULT_CONTEXT = Object.freeze({
  aircraftRangeNm: 40,
  airportRadiusNm: 40,
  airportLimit: 12,
  fullTraceForFocal: false,
  showNearbyContext: true,
  showNearbyMapContext: true,
  zoomDisabled: false,
  nearbyRangeRings: Object.freeze({
    intervalNm: 5,
    maxNm: 5,
    prominent: true,
  }),
  mapFitOptions: Object.freeze({
    padding: Object.freeze([60, 60]),
    maxZoom: 14,
  }),
  autoFitSuspendsFollow: false,
});

const FLIGHTAWARE_DESKTOP_CONTEXT = Object.freeze({
  aircraftRangeNm: 220,
  airportRadiusNm: 250,
  airportLimit: 12,
  fullTraceForFocal: true,
  showNearbyContext: true,
  showNearbyMapContext: false,
  zoomDisabled: true,
  nearbyRangeRings: null,
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
