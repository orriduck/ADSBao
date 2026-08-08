import assert from "node:assert/strict";
import test from "node:test";
import {
  NEARBY_EXPLORER_RADIUS_NM,
  clampMapCenterToNearbyRadius,
  getMapDistanceNm,
  resolveViewportSafeCenterRadiusNm,
} from "./nearbyExplorerRadiusModel";

test("nearby explorer keeps in-range map centers unchanged", () => {
  const next = clampMapCenterToNearbyRadius({
    anchor: { lat: 42.36, lng: -71.01 },
    center: { lat: 42.5, lng: -71.01 },
  });

  assert.equal(next?.corrected, false);
  assert.equal(next?.lat, 42.5);
  assert.equal(next?.lng, -71.01);
});

test("nearby explorer clamps a moved map center onto the 80 NM boundary", () => {
  const anchor = { lat: 0, lng: 0 };
  const next = clampMapCenterToNearbyRadius({
    anchor,
    center: { lat: 0, lng: 2 },
  });

  assert.equal(next?.corrected, true);
  assert.ok((next?.distanceNm || 0) > NEARBY_EXPLORER_RADIUS_NM);
  const actualDistance = getMapDistanceNm(anchor, next || {});
  assert.ok(Math.abs((actualDistance || 0) - NEARBY_EXPLORER_RADIUS_NM) < 0.01);
});

test("nearby explorer reserves room for the full viewport inside its data circle", () => {
  const safeCenterRadius = resolveViewportSafeCenterRadiusNm({
    center: { lat: 0, lng: 0 },
    corners: [
      { lat: 0, lng: -0.5 },
      { lat: 0, lng: 0.5 },
      { lat: 0.5, lng: 0 },
      { lat: -0.5, lng: 0 },
    ],
  });

  assert.ok(safeCenterRadius > 49 && safeCenterRadius < 50.1);
});
