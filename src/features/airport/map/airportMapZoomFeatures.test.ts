import assert from "node:assert/strict";

import {
  ZOOM_AIRPORT,
  ZOOM_APPROACH,
  ZOOM_DETAIL,
} from "../../../utils/airportMapDisplay";
import {
  airportGroundTrafficHideRadiusNmForZoom,
  shouldShowAirportAreaCountForZoom,
  shouldShowNearbyAirportRunwaysForZoom,
  shouldShowRunwayEndLabelsForZoom,
  shouldShowCandidateWatchingSpotDetailsForZoom,
  shouldUseCandidateWatchingSpotBadgesForZoom,
} from "./airportMapZoomFeatures";

assert.equal(airportGroundTrafficHideRadiusNmForZoom(ZOOM_APPROACH), 3);
assert.equal(airportGroundTrafficHideRadiusNmForZoom(ZOOM_AIRPORT), 0.5);
assert.equal(airportGroundTrafficHideRadiusNmForZoom(ZOOM_DETAIL), null);
assert.equal(shouldShowAirportAreaCountForZoom(ZOOM_APPROACH), true);
assert.equal(shouldShowAirportAreaCountForZoom(ZOOM_AIRPORT), true);
assert.equal(shouldShowNearbyAirportRunwaysForZoom(ZOOM_AIRPORT), true);
assert.equal(shouldShowRunwayEndLabelsForZoom(ZOOM_DETAIL), true);
assert.equal(shouldShowCandidateWatchingSpotDetailsForZoom(ZOOM_APPROACH), true);
assert.equal(shouldShowCandidateWatchingSpotDetailsForZoom(ZOOM_AIRPORT), true);
assert.equal(shouldShowCandidateWatchingSpotDetailsForZoom(ZOOM_DETAIL), true);
assert.equal(shouldUseCandidateWatchingSpotBadgesForZoom(ZOOM_APPROACH), true);
assert.equal(shouldUseCandidateWatchingSpotBadgesForZoom(ZOOM_AIRPORT), false);
assert.equal(shouldUseCandidateWatchingSpotBadgesForZoom(ZOOM_DETAIL), false);
assert.equal(shouldUseCandidateWatchingSpotBadgesForZoom(9), true);
assert.equal(airportGroundTrafficHideRadiusNmForZoom(12), null);
assert.equal(shouldShowAirportAreaCountForZoom(12), false);
assert.equal(shouldShowNearbyAirportRunwaysForZoom(12), true);
assert.equal(shouldShowCandidateWatchingSpotDetailsForZoom(12), true);
assert.equal(shouldUseCandidateWatchingSpotBadgesForZoom(12), false);

console.log("airportMapZoomFeatures.test.ts ok");
