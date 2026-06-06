"use client";

import {
  FEATURE_FLAGS,
  isFeatureFlagEnabled,
} from "../feature-flags/userFeatureFlagsModel";
import { useUserFeatureFlags } from "./useFlightAwareEnabled";

// Gates the Plane Hunter capture studio (camera viewfinder + template
// overlays + photo export). The studio still ships in the bundle but
// the trigger only renders for signed-in users with the
// `planeHunterEnabled` feature flag set, matching the FlightAware
// rollout pattern.
export function usePlaneHunterEnabled() {
  const { flags } = useUserFeatureFlags();
  return isFeatureFlagEnabled(flags, FEATURE_FLAGS.PLANE_HUNTER_ENABLED);
}
