import {
  FEATURE_FLAGS,
  getClerkUserPrimaryEmail,
  isFeatureFlagEnabled,
  normalizeFeatureFlags,
  resolveFeatureFlagEnvironment,
} from "./userFeatureFlagsModel.js";
import {
  createUserFeatureFlagsRepositoryFromEnv,
} from "../../../app/api/dao/userFeatureFlags.dao.js";

export async function resolveFeatureFlagsForUser({
  user,
  env = process.env,
  repository = createUserFeatureFlagsRepositoryFromEnv(),
} = {}) {
  const email = getClerkUserPrimaryEmail(user);
  if (!email || !repository) return {};
  const environment = resolveFeatureFlagEnvironment(env);

  try {
    const row = await repository.readFlagsByEmail(email, { environment });
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
