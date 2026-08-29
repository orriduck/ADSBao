import assert from "node:assert/strict";
import {
  THREE_OSM_ACCEPTANCE_OVERLAY_PROFILE,
  hasThreeOsmFullOperationalOverlaySettings,
  resolveThreeOsmAcceptanceOverlayProfile,
  verifyThreeOsmOperationalOverlayProfile,
} from "./threeOsmAcceptanceProfile";

const userSettings = {
  showAirspaces: false,
  showNavaidMarkers: false,
  showReportingPoints: true,
  showCandidateWatchingSpots: false,
  showCallsigns: false,
};

assert.deepEqual(
  resolveThreeOsmAcceptanceOverlayProfile({
    enabled: false,
    settings: userSettings,
  }),
  {
    id: "user",
    settings: userSettings,
  },
);

const acceptanceProfile = resolveThreeOsmAcceptanceOverlayProfile({
  enabled: true,
  settings: userSettings,
});
assert.equal(acceptanceProfile.id, THREE_OSM_ACCEPTANCE_OVERLAY_PROFILE);
assert.deepEqual(acceptanceProfile.settings, {
  showAirspaces: true,
  showNavaidMarkers: true,
  showReportingPoints: true,
  showCandidateWatchingSpots: true,
  showCallsigns: true,
});
assert.equal(
  hasThreeOsmFullOperationalOverlaySettings(acceptanceProfile.settings),
  true,
);
assert.equal(
  verifyThreeOsmOperationalOverlayProfile({
    requestedProfile: acceptanceProfile.id,
    settings: acceptanceProfile.settings,
  }),
  THREE_OSM_ACCEPTANCE_OVERLAY_PROFILE,
);
assert.equal(
  verifyThreeOsmOperationalOverlayProfile({
    requestedProfile: THREE_OSM_ACCEPTANCE_OVERLAY_PROFILE,
    settings: userSettings,
  }),
  "user",
);
assert.deepEqual(userSettings, {
  showAirspaces: false,
  showNavaidMarkers: false,
  showReportingPoints: true,
  showCandidateWatchingSpots: false,
  showCallsigns: false,
});

console.log("threeOsmAcceptanceProfile.test.ts ok");
