import {
  FEATURE_FLAGS,
  getClerkUserPrimaryEmail,
  isFeatureFlagEnabled,
  normalizeFeatureFlags,
} from "./userFeatureFlagsModel.js";
import {
  createUserFeatureFlagsRepositoryFromEnv,
} from "../../../app/api/dao/userFeatureFlags.dao.js";

export async function resolveFeatureFlagsForUser({
  user,
  repository = createUserFeatureFlagsRepositoryFromEnv(),
} = {}) {
  const email = getClerkUserPrimaryEmail(user);
  if (!email || !repository) return {};

  try {
    const row = await repository.readFlagsByEmail(email);
    return normalizeFeatureFlags(row?.flags);
  } catch (error) {
    console.warn(
      `[feature-flags] Supabase read failed for ${email}:`,
      error.message,
    );
    return {};
  }
}

export async function isFlightAwareEnabledForUser(options = {}) {
  const flags = await resolveFeatureFlagsForUser(options);
  return isFeatureFlagEnabled(flags, FEATURE_FLAGS.FLIGHTAWARE_ENABLED);
}
