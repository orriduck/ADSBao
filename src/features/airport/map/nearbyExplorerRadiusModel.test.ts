import assert from "node:assert/strict";
import test from "node:test";
import {
  NEARBY_EXPLORER_DRAG_HALF_SIDE_NM,
  NEARBY_EXPLORER_RADIUS_NM,
  clampMapCenterToNearbySquare,
  getMapDistanceNm,
} from "./nearbyExplorerRadiusModel";

test("nearby explorer keeps map centers inside its 120 NM square unchanged", () => {
  const next = clampMapCenterToNearbySquare({
    anchor: { lat: 42.36, lng: -71.01 },
    center: { lat: 42.5, lng: -71.01 },
  });

  assert.equal(next?.corrected, false);
  assert.equal(next?.lat, 42.5);
  assert.equal(next?.lng, -71.01);
});

test("nearby explorer clamps each axis to the 120 NM square edge", () => {
  const anchor = { lat: 0, lng: 0 };
  const next = clampMapCenterToNearbySquare({
    anchor,
    center: { lat: 3, lng: 3 },
  });

  assert.equal(next?.corrected, true);
  assert.equal(next?.lat, 2);
  assert.equal(next?.lng, 2);
  assert.equal(next?.northNm, 180);
  assert.equal(next?.eastNm, 180);
});

test("nearby explorer permits a diagonal corner of the square", () => {
  const next = clampMapCenterToNearbySquare({
    anchor: { lat: 0, lng: 0 },
    center: { lat: 1.9, lng: 1.9 },
  });

  assert.equal(NEARBY_EXPLORER_RADIUS_NM, 80);
  assert.equal(NEARBY_EXPLORER_DRAG_HALF_SIDE_NM, 120);
  assert.equal(next?.corrected, false);
  assert.ok((getMapDistanceNm({ lat: 0, lng: 0 }, next || {}) || 0) > 120);
});
