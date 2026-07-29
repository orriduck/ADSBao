import assert from "node:assert/strict";

import {
  ZOOM_AIRPORT,
  ZOOM_APPROACH,
  ZOOM_DETAIL,
} from "../../../utils/airportMapDisplay";
import {
  airportGroundTrafficSecondaryRadiusNmForZoom,
  shouldShowAirportAreaCountForZoom,
  shouldShowNearbyAirportRunwaysForZoom,
  shouldShowRunwayEndLabelsForZoom,
  shouldShowCandidateWatchingSpotDetailsForZoom,
  shouldUseCandidateWatchingSpotBadgesForZoom,
} from "./airportMapZoomFeatures";

assert.equal(airportGroundTrafficSecondaryRadiusNmForZoom(ZOOM_APPROACH), 3);
assert.equal(airportGroundTrafficSecondaryRadiusNmForZoom(ZOOM_AIRPORT), 3);
assert.equal(airportGroundTrafficSecondaryRadiusNmForZoom(ZOOM_DETAIL), null);
assert.equal(shouldShowAirportAreaCountForZoom(ZOOM_APPROACH), true);
assert.equal(shouldShowAirportAreaCountForZoom(ZOOM_AIRPORT), true);
assert.equal(shouldShowNearbyAirportRunwaysForZoom(ZOOM_AIRPORT), true);
assert.equal(shouldShowRunwayEndLabelsForZoom(ZOOM_DETAIL), true);
assert.equal(shouldShowCandidateWatchingSpotDetailsForZoom(ZOOM_APPROACH), true);
assert.equal(shouldShowCandidateWatchingSpotDetailsForZoom(ZOOM_AIRPORT), true);
assert.equal(shouldShowCandidateWatchingSpotDetailsForZoom(ZOOM_DETAIL), true);
assert.equal(shouldUseCandidateWatchingSpotBadgesForZoom(ZOOM_APPROACH), false);
assert.equal(shouldUseCandidateWatchingSpotBadgesForZoom(ZOOM_AIRPORT), true);
assert.equal(shouldUseCandidateWatchingSpotBadgesForZoom(ZOOM_DETAIL), true);
assert.equal(shouldUseCandidateWatchingSpotBadgesForZoom(9), false);
assert.equal(airportGroundTrafficSecondaryRadiusNmForZoom(11.9), 3);
assert.equal(airportGroundTrafficSecondaryRadiusNmForZoom(12), null);
assert.equal(shouldShowAirportAreaCountForZoom(12), false);
assert.equal(shouldShowNearbyAirportRunwaysForZoom(12), true);
assert.equal(shouldShowCandidateWatchingSpotDetailsForZoom(12), true);
assert.equal(shouldUseCandidateWatchingSpotBadgesForZoom(12), true);

console.log("airportMapZoomFeatures.test.ts ok");
