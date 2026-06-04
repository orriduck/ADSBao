import {
  createUserMapSettingsRepositoryFromEnv,
} from "../../../app/api/dao/userMapSettings.dao";
import {
  getClerkUserPrimaryEmail,
  isImmersiveModeEnabled,
} from "../../app-shell/feature-flags/userFeatureFlagsModel";
import {
  resolveFeatureFlagsForUser,
} from "../../app-shell/feature-flags/userFeatureFlags.server";
type UserMapSettingsServerRecord = Record<string, any>;

export async function resolveMapSettingsForUser({
  user,
  env = process.env,
  featureFlagsRepository,
  repository = createUserMapSettingsRepositoryFromEnv(),
}: UserMapSettingsServerRecord = {}) {
  const email = getClerkUserPrimaryEmail(user);
  if (!email || !repository) return null;
  const immersiveModeEnabled = isImmersiveModeEnabled(
    await resolveFeatureFlagsForUser({
      user,
      env,
      repository: featureFlagsRepository,
    }),
  );

  try {
    const row = await repository.readSettingsByEmail(email, {
      immersiveModeEnabled,
    });
    return row?.settings || null;
  } catch (error: any) {
    console.warn(`[map-settings] Supabase read failed for ${email}:`, error.message);
    return null;
  }
}

export async function persistMapSettingsForUser({
  user,
  env = process.env,
  featureFlagsRepository,
  settings,
  repository = createUserMapSettingsRepositoryFromEnv(),
}: UserMapSettingsServerRecord = {}) {
  const email = getClerkUserPrimaryEmail(user);
  if (!email || !repository) return null;
  const immersiveModeEnabled = isImmersiveModeEnabled(
    await resolveFeatureFlagsForUser({
      user,
      env,
      repository: featureFlagsRepository,
    }),
  );

  const row = await repository.upsertSettingsByEmail({
    email,
    immersiveModeEnabled,
    settings,
  });
  return row?.settings || null;
}
