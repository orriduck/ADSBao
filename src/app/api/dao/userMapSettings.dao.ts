import { createServerSupabaseClient } from "./supabaseClient";
import {
  normalizeFeatureFlagEnvironment,
  normalizeUserEmail,
  resolveFeatureFlagEnvironment,
} from "../../../features/app-shell/feature-flags/userFeatureFlagsModel";
import {
  normalizeMapSettings,
} from "../../../features/airport/map-settings/mapSettingsModel";

export const USER_MAP_SETTINGS_TABLE = "user_map_settings";
const SELECT_COLUMNS = "email,environment,settings,updated_at";

type UserMapSettingsRecord = Record<string, any>;

export function createUserMapSettingsRepository({
  supabaseUrl,
  supabaseKey,
  environment,
  createClientImpl,
}: UserMapSettingsRecord = {}) {
  const client = createServerSupabaseClient({
    supabaseUrl,
    supabaseKey,
    createClientImpl,
  });
  if (!client) return null;
  const defaultEnvironment = normalizeFeatureFlagEnvironment(environment);

  return {
    async readSettingsByEmail(email: unknown, options: UserMapSettingsRecord = {}) {
      const normalizedEmail = normalizeUserEmail(email);
      if (!normalizedEmail) return null;
      const normalizedEnvironment = normalizeFeatureFlagEnvironment(
        options.environment || defaultEnvironment,
      );

      const { data, error } = await client
        .from(USER_MAP_SETTINGS_TABLE)
        .select(SELECT_COLUMNS)
        .eq("email", normalizedEmail)
        .eq("environment", normalizedEnvironment)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw new Error(`User map settings read failed (${error.message})`);
      }

      if (!data) return null;
      return {
        email: normalizeUserEmail(data.email),
        environment: normalizeFeatureFlagEnvironment(data.environment),
        settings: normalizeMapSettings(data.settings),
        updatedAt: data.updated_at || "",
      };
    },

    async upsertSettingsByEmail({
      email,
      environment,
      settings,
    }: UserMapSettingsRecord = {}) {
      const normalizedEmail = normalizeUserEmail(email);
      if (!normalizedEmail) return null;
      const normalizedEnvironment = normalizeFeatureFlagEnvironment(
        environment || defaultEnvironment,
      );
      const normalizedSettings = normalizeMapSettings(settings);
      const updatedAt = normalizedSettings.updatedAt || new Date().toISOString();

      const { data, error } = await client
        .from(USER_MAP_SETTINGS_TABLE)
        .upsert(
          {
            email: normalizedEmail,
            environment: normalizedEnvironment,
            settings: {
              ...normalizedSettings,
              updatedAt,
            },
            updated_at: updatedAt,
          },
          { onConflict: "email,environment" },
        )
        .select(SELECT_COLUMNS)
        .single();

      if (error) {
        throw new Error(`User map settings upsert failed (${error.message})`);
      }

      return {
        email: normalizeUserEmail(data.email),
        environment: normalizeFeatureFlagEnvironment(data.environment),
        settings: normalizeMapSettings(data.settings),
        updatedAt: data.updated_at || "",
      };
    },
  };
}

export function createUserMapSettingsRepositoryFromEnv({
  env = process.env,
  createClientImpl,
}: {
  env?: Record<string, string | undefined>;
  createClientImpl?: any;
} = {}) {
  return createUserMapSettingsRepository({
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL,
    supabaseKey: env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY,
    environment: resolveFeatureFlagEnvironment(env),
    createClientImpl,
  });
}
