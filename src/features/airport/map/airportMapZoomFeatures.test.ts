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
  shouldShowCandidateWatchingSpotCountForZoom,
  shouldShowCandidateWatchingSpotDetailsForZoom,
} from "./airportMapZoomFeatures";

assert.equal(airportGroundTrafficHideRadiusNmForZoom(ZOOM_APPROACH), 3);
assert.equal(airportGroundTrafficHideRadiusNmForZoom(ZOOM_AIRPORT), 0.5);
assert.equal(airportGroundTrafficHideRadiusNmForZoom(ZOOM_DETAIL), null);
assert.equal(shouldShowAirportAreaCountForZoom(ZOOM_APPROACH), true);
assert.equal(shouldShowAirportAreaCountForZoom(ZOOM_AIRPORT), true);
assert.equal(shouldShowNearbyAirportRunwaysForZoom(ZOOM_AIRPORT), true);
assert.equal(shouldShowRunwayEndLabelsForZoom(ZOOM_DETAIL), true);
assert.equal(shouldShowCandidateWatchingSpotCountForZoom(ZOOM_APPROACH), true);
assert.equal(shouldShowCandidateWatchingSpotCountForZoom(ZOOM_AIRPORT), true);
assert.equal(shouldShowCandidateWatchingSpotCountForZoom(ZOOM_DETAIL), false);
assert.equal(shouldShowCandidateWatchingSpotDetailsForZoom(ZOOM_APPROACH), false);
assert.equal(shouldShowCandidateWatchingSpotDetailsForZoom(ZOOM_AIRPORT), false);
assert.equal(shouldShowCandidateWatchingSpotDetailsForZoom(ZOOM_DETAIL), true);
assert.equal(airportGroundTrafficHideRadiusNmForZoom(12), null);
assert.equal(shouldShowAirportAreaCountForZoom(12), false);
assert.equal(shouldShowNearbyAirportRunwaysForZoom(12), true);

console.log("airportMapZoomFeatures.test.ts ok");
