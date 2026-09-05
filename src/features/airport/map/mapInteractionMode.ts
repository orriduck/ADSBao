export enum AirportMapInteractionMode {
  AirportExploration = "airport-exploration",
  FlightTracking = "flight-tracking",
  UserLocationTracking = "user-location-tracking",
}

export function resolveAirportMapInteraction(mode: AirportMapInteractionMode) {
  const allowsDragging = mode === AirportMapInteractionMode.AirportExploration;

  return {
    allowsDragging,
    constrainsViewportToNearbyTraffic: allowsDragging,
    showsNearbyTrafficBoundary: allowsDragging,
  };
}
