import assert from "node:assert/strict";
import test from "node:test";
import {
  AirportMapInteractionMode,
  resolveAirportMapInteraction,
} from "./mapInteractionMode";

test("airport exploration keeps bounded map dragging enabled", () => {
  assert.deepEqual(
    resolveAirportMapInteraction(AirportMapInteractionMode.AirportExploration),
    {
      allowsDragging: true,
      constrainsViewportToNearbyTraffic: true,
      showsNearbyTrafficBoundary: true,
    },
  );
});

test("flight tracking locks the map view", () => {
  assert.deepEqual(
    resolveAirportMapInteraction(AirportMapInteractionMode.FlightTracking),
    {
      allowsDragging: false,
      constrainsViewportToNearbyTraffic: false,
      showsNearbyTrafficBoundary: false,
    },
  );
});

test("Here locks the viewport to the GPS position without a draggable boundary", () => {
  assert.deepEqual(
    resolveAirportMapInteraction(AirportMapInteractionMode.UserLocationTracking),
    {
      allowsDragging: false,
      constrainsViewportToNearbyTraffic: false,
      showsNearbyTrafficBoundary: false,
    },
  );
});
