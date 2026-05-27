import assert from "node:assert/strict";

import {
  resolveFlightTrackingDisplayContext,
} from "./flightTrackingDisplayModel.js";

{
  const context = resolveFlightTrackingDisplayContext({
    trackingState: { status: "adsb_live" },
    isMobile: false,
  });

  assert.equal(context.aircraftRangeNm, 40);
  assert.equal(context.airportRadiusNm, 40);
  assert.equal(context.airportLimit, 12);
  assert.equal(context.fullTraceForFocal, false);
  assert.equal(context.showNearbyContext, true);
  assert.equal(context.showNearbyMapContext, true);
  assert.equal(context.zoomDisabled, false);
  assert.deepEqual(context.nearbyRangeRings, {
    intervalNm: 5,
    maxNm: 5,
    prominent: true,
  });
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
  assert.equal(context.airportRadiusNm, 250);
  assert.equal(context.airportLimit, 12);
  assert.equal(context.fullTraceForFocal, true);
  assert.equal(context.showNearbyContext, true);
  assert.equal(context.showNearbyMapContext, false);
  assert.equal(context.zoomDisabled, true);
  assert.equal(context.nearbyRangeRings, null);
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

console.log("flightTrackingDisplayModel.test.js ok");
