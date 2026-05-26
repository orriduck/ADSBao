import { createServerSupabaseClient } from "./supabaseClient.js";
import {
  normalizeFeatureFlags,
  normalizeUserEmail,
} from "../../../features/app-shell/feature-flags/userFeatureFlagsModel.js";

export const USER_FEATURE_FLAGS_TABLE = "user_feature_flags";
const SELECT_COLUMNS = "email,flags,updated_at";

export function createUserFeatureFlagsRepository({
  supabaseUrl,
  supabaseKey,
  createClientImpl,
} = {}) {
  const client = createServerSupabaseClient({
    supabaseUrl,
    supabaseKey,
    createClientImpl,
  });
  if (!client) return null;

  return {
    async readFlagsByEmail(email) {
      const normalizedEmail = normalizeUserEmail(email);
      if (!normalizedEmail) return null;

      const { data, error } = await client
        .from(USER_FEATURE_FLAGS_TABLE)
        .select(SELECT_COLUMNS)
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw new Error(
          `User feature flags read failed (${error.message})`,
        );
      }

      if (!data) return null;
      return {
        email: normalizeUserEmail(data.email),
        flags: normalizeFeatureFlags(data.flags),
        updatedAt: data.updated_at || "",
      };
    },

    async upsertFlagsByEmail({ email, flags } = {}) {
      const normalizedEmail = normalizeUserEmail(email);
      if (!normalizedEmail) return null;

      const { data, error } = await client
        .from(USER_FEATURE_FLAGS_TABLE)
        .upsert(
          {
            email: normalizedEmail,
            flags: normalizeFeatureFlags(flags),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "email" },
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
        flags: normalizeFeatureFlags(data.flags),
        updatedAt: data.updated_at || "",
      };
    },

    async deleteFlagsByEmail(email) {
      const normalizedEmail = normalizeUserEmail(email);
      if (!normalizedEmail) return null;

      const { error } = await client
        .from(USER_FEATURE_FLAGS_TABLE)
        .delete()
        .eq("email", normalizedEmail);

      if (error) {
        throw new Error(
          `User feature flags delete failed (${error.message})`,
        );
      }

      return { email: normalizedEmail };
    },
  };
}

export function createUserFeatureFlagsRepositoryFromEnv({
  env = process.env,
  createClientImpl,
} = {}) {
  return createUserFeatureFlagsRepository({
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL,
    supabaseKey: env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY,
    createClientImpl,
  });
}
