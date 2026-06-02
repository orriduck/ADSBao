import assert from "node:assert/strict";

import {
  ZOOM_AIRPORT,
  ZOOM_APPROACH,
  ZOOM_DETAIL,
} from "../../../utils/airportMapDisplay";
import {
  airportMapZoomFeaturesFor,
  airportGroundTrafficHideRadiusNmForZoom,
  shouldShowAirportAreaCountForZoom,
  shouldShowNearbyAirportRunwaysForZoom,
  shouldShowRangeRingLabelsForZoom,
  shouldShowRunwayEndLabelsForZoom,
} from "./airportMapZoomFeatures";

assert.deepEqual(airportMapZoomFeaturesFor(ZOOM_APPROACH), {
  airportGroundTrafficHideRadiusNm: 3,
  showAirportAreaCount: true,
  showNearbyAirportRunways: true,
  showRangeRingLabels: false,
  showRunwayEndLabels: false,
});

assert.deepEqual(airportMapZoomFeaturesFor(ZOOM_AIRPORT), {
  airportGroundTrafficHideRadiusNm: 0.5,
  showAirportAreaCount: false,
  showNearbyAirportRunways: true,
  showRangeRingLabels: true,
  showRunwayEndLabels: false,
});

assert.deepEqual(airportMapZoomFeaturesFor(ZOOM_DETAIL), {
  airportGroundTrafficHideRadiusNm: null,
  showAirportAreaCount: false,
  showNearbyAirportRunways: true,
  showRangeRingLabels: true,
  showRunwayEndLabels: true,
});

assert.deepEqual(airportMapZoomFeaturesFor(12), {
  airportGroundTrafficHideRadiusNm: null,
  showAirportAreaCount: false,
  showNearbyAirportRunways: false,
  showRangeRingLabels: false,
  showRunwayEndLabels: false,
});

assert.equal(airportGroundTrafficHideRadiusNmForZoom(ZOOM_APPROACH), 3);
assert.equal(airportGroundTrafficHideRadiusNmForZoom(ZOOM_AIRPORT), 0.5);
assert.equal(airportGroundTrafficHideRadiusNmForZoom(ZOOM_DETAIL), null);
assert.equal(shouldShowAirportAreaCountForZoom(ZOOM_APPROACH), true);
assert.equal(shouldShowAirportAreaCountForZoom(ZOOM_AIRPORT), false);
assert.equal(shouldShowNearbyAirportRunwaysForZoom(ZOOM_AIRPORT), true);
assert.equal(shouldShowRangeRingLabelsForZoom(ZOOM_AIRPORT), true);
assert.equal(shouldShowRunwayEndLabelsForZoom(ZOOM_DETAIL), true);
