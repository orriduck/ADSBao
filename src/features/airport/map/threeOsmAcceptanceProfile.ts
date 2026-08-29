export const THREE_OSM_ACCEPTANCE_OVERLAY_PROFILE = "full-operational";

export type ThreeOsmOperationalOverlaySettings = {
  showAirspaces: boolean;
  showNavaidMarkers: boolean;
  showReportingPoints: boolean;
  showCandidateWatchingSpots: boolean;
  showCallsigns: boolean;
};

export function hasThreeOsmFullOperationalOverlaySettings(
  settings: ThreeOsmOperationalOverlaySettings,
) {
  return (
    settings.showAirspaces &&
    settings.showNavaidMarkers &&
    settings.showReportingPoints &&
    settings.showCandidateWatchingSpots &&
    settings.showCallsigns
  );
}

export function verifyThreeOsmOperationalOverlayProfile(input: {
  requestedProfile: string;
  settings: ThreeOsmOperationalOverlaySettings;
}) {
  return input.requestedProfile === THREE_OSM_ACCEPTANCE_OVERLAY_PROFILE &&
    hasThreeOsmFullOperationalOverlaySettings(input.settings)
    ? THREE_OSM_ACCEPTANCE_OVERLAY_PROFILE
    : "user";
}

export function resolveThreeOsmAcceptanceOverlayProfile(input: {
  enabled: boolean;
  settings: ThreeOsmOperationalOverlaySettings;
}) {
  if (!input.enabled) {
    return {
      id: "user" as const,
      settings: { ...input.settings },
    };
  }
  return {
    id: THREE_OSM_ACCEPTANCE_OVERLAY_PROFILE,
    settings: {
      showAirspaces: true,
      showNavaidMarkers: true,
      showReportingPoints: true,
      showCandidateWatchingSpots: true,
      showCallsigns: true,
    },
  };
}
