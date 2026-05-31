import { createServerSupabaseClient } from "./supabaseClient";
import {
  normalizeFeatureFlags,
  normalizeFeatureFlagEnvironment,
  normalizeUserEmail,
  resolveFeatureFlagEnvironment,
} from "../../../features/app-shell/feature-flags/userFeatureFlagsModel";

export const USER_FEATURE_FLAGS_TABLE = "user_feature_flags";
const SELECT_COLUMNS = "email,environment,flags,updated_at";

type UserFeatureFlagsRecord = Record<string, any>;

export function createUserFeatureFlagsRepository({
  supabaseUrl,
  supabaseKey,
  environment,
  createClientImpl,
}: UserFeatureFlagsRecord = {}) {
  const client = createServerSupabaseClient({
    supabaseUrl,
    supabaseKey,
    createClientImpl,
  });
  if (!client) return null;
  const defaultEnvironment = normalizeFeatureFlagEnvironment(environment);

  return {
    async readFlagsByEmail(email: unknown, options: UserFeatureFlagsRecord = {}) {
      const normalizedEmail = normalizeUserEmail(email);
      if (!normalizedEmail) return null;
      const normalizedEnvironment = normalizeFeatureFlagEnvironment(
        options.environment || defaultEnvironment,
      );

      const { data, error } = await client
        .from(USER_FEATURE_FLAGS_TABLE)
        .select(SELECT_COLUMNS)
        .eq("email", normalizedEmail)
        .eq("environment", normalizedEnvironment)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw new Error(
          `User feature flags read failed (${error.message})`,
        );
      }

      if (!data) return null;
      return {
        email: normalizeUserEmail(data.email),
        environment: normalizeFeatureFlagEnvironment(data.environment),
        flags: normalizeFeatureFlags(data.flags),
        updatedAt: data.updated_at || "",
      };
    },

    async upsertFlagsByEmail({ email, environment, flags }: UserFeatureFlagsRecord = {}) {
      const normalizedEmail = normalizeUserEmail(email);
      if (!normalizedEmail) return null;
      const normalizedEnvironment = normalizeFeatureFlagEnvironment(
        environment || defaultEnvironment,
      );

      const { data, error } = await client
        .from(USER_FEATURE_FLAGS_TABLE)
        .upsert(
          {
            email: normalizedEmail,
            environment: normalizedEnvironment,
            flags: normalizeFeatureFlags(flags),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "email,environment" },
        )
        .select(SELECT_COLUMNS)
        .single();

      if (error) {
        throw new Error(
          `User feature flags upsert failed (${error.message})`,
        );
      }

      return {
        email: normalizeUserEmail(data.email),
        environment: normalizeFeatureFlagEnvironment(data.environment),
        flags: normalizeFeatureFlags(data.flags),
        updatedAt: data.updated_at || "",
      };
    },

    async deleteFlagsByEmail(email: unknown, options: UserFeatureFlagsRecord = {}) {
      const normalizedEmail = normalizeUserEmail(email);
      if (!normalizedEmail) return null;
      const normalizedEnvironment = normalizeFeatureFlagEnvironment(
        options.environment || defaultEnvironment,
      );

      const { error } = await client
        .from(USER_FEATURE_FLAGS_TABLE)
        .delete()
        .eq("email", normalizedEmail)
        .eq("environment", normalizedEnvironment);

      if (error) {
        throw new Error(
          `User feature flags delete failed (${error.message})`,
        );
      }

      return { email: normalizedEmail, environment: normalizedEnvironment };
    },
  };
}

export function createUserFeatureFlagsRepositoryFromEnv({
  env = process.env,
  createClientImpl,
}: {
  env?: Record<string, string | undefined>;
  createClientImpl?: any;
} = {}) {
  return createUserFeatureFlagsRepository({
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL,
    supabaseKey: env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY,
    environment: resolveFeatureFlagEnvironment(env),
    createClientImpl,
  });
}
