import assert from "node:assert/strict";

import {
  resolveFlightTrackingDisplayContext,
} from "./flightTrackingDisplayModel";
import { AIRCRAFT_TRAFFIC_CONFIG } from "../../../config/aviation";
import {
  NEARBY_AIRPORT_DEFAULTS,
  NEARBY_AIRPORT_LIMITS,
} from "../../airport/nearby/nearbyAirports.models";

{
  const context = resolveFlightTrackingDisplayContext({
    trackingState: { status: "adsb_live" },
    isMobile: false,
  });

  assert.equal(context.aircraftRangeNm, AIRCRAFT_TRAFFIC_CONFIG.rangeNm);
  assert.equal(context.airportRadiusNm, NEARBY_AIRPORT_DEFAULTS.radiusNm);
  assert.equal(context.airportLimit, NEARBY_AIRPORT_LIMITS.maxLimit);
  assert.equal(context.fullTraceForFocal, true);
  assert.equal(context.showNearbyContext, true);
  assert.equal(context.showNearbyMapContext, true);
  assert.equal(context.zoomDisabled, false);
  assert.deepEqual(context.mapFitOptions, {
    padding: [60, 60],
    maxZoom: 14,
  });
  assert.equal(context.autoFitSuspendsFollow, false);
}

{
  const context = resolveFlightTrackingDisplayContext({
    trackingState: { status: "flightaware_active" },
    isMobile: false,
  });

  assert.equal(context.aircraftRangeNm, 220);
  assert.equal(context.airportRadiusNm, NEARBY_AIRPORT_DEFAULTS.radiusNm);
  assert.equal(context.airportLimit, NEARBY_AIRPORT_LIMITS.maxLimit);
  assert.equal(context.fullTraceForFocal, true);
  assert.equal(context.showNearbyContext, true);
  assert.equal(context.showNearbyMapContext, false);
  assert.equal(context.zoomDisabled, true);
  assert.deepEqual(context.mapFitOptions, {
    padding: [84, 84],
    maxZoom: 8,
  });
  assert.equal(context.autoFitSuspendsFollow, true);
}

{
  const context = resolveFlightTrackingDisplayContext({
    trackingState: { status: "flightaware_active" },
    isMobile: true,
  });

  assert.deepEqual(context.mapFitOptions, {
    paddingTopLeft: [34, 72],
    paddingBottomRight: [34, 72],
    maxZoom: 7,
  });
}

console.log("flightTrackingDisplayModel.test.ts ok");
