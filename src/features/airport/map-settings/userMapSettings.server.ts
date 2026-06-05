import {
  createUserMapSettingsRepositoryFromEnv,
} from "../../../app/api/dao/userMapSettings.dao";
import {
  getClerkUserPrimaryEmail,
} from "../../app-shell/feature-flags/userFeatureFlagsModel";
import { normalizeMapSettings } from "./mapSettingsModel";
type UserMapSettingsServerRecord = Record<string, any>;

export async function resolveMapSettingsForUser({
  user,
  repository = createUserMapSettingsRepositoryFromEnv(),
}: UserMapSettingsServerRecord = {}) {
  const email = getClerkUserPrimaryEmail(user);
  if (!email || !repository) return null;

  try {
    const row = await repository.readSettingsByEmail(email);
    return row?.settings ? normalizeMapSettings(row.settings) : null;
  } catch (error: any) {
    console.warn(`[map-settings] Supabase read failed for ${email}:`, error.message);
    return null;
  }
}

export async function persistMapSettingsForUser({
  user,
  settings,
  repository = createUserMapSettingsRepositoryFromEnv(),
}: UserMapSettingsServerRecord = {}) {
  const email = getClerkUserPrimaryEmail(user);
  if (!email || !repository) return null;

  const row = await repository.upsertSettingsByEmail({
    email,
    settings: normalizeMapSettings(settings),
  });
  return row?.settings ? normalizeMapSettings(row.settings) : null;
}
