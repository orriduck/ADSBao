import {
  createPostgresQueryClientFromEnv,
  type PostgresQueryClient,
} from "./postgresClient";
import {
  normalizeFeatureFlags,
  normalizeFeatureFlagEnvironment,
  normalizeUserEmail,
  resolveFeatureFlagEnvironment,
} from "../../features/app-shell/feature-flags/userFeatureFlagsModel";

const USER_FEATURE_FLAGS_TABLE = "app_user.user_feature_flags";
const SELECT_COLUMNS = "email,environment,flags,updated_at";

type UserFeatureFlagsRecord = Record<string, any>;

function createUserFeatureFlagsRepository({
  environment,
  queryClient,
}: {
  environment?: unknown;
  queryClient?: PostgresQueryClient | null;
} = {}) {
  if (!queryClient) return null;
  const defaultEnvironment = normalizeFeatureFlagEnvironment(environment);

  return {
    async readFlagsByEmail(email: unknown, options: UserFeatureFlagsRecord = {}) {
      const normalizedEmail = normalizeUserEmail(email);
      if (!normalizedEmail) return null;
      const normalizedEnvironment = normalizeFeatureFlagEnvironment(
        options.environment || defaultEnvironment,
      );

      let row = null;
      try {
        const result = await queryClient.query<UserFeatureFlagsRecord>(
          `
            select ${SELECT_COLUMNS}
            from ${USER_FEATURE_FLAGS_TABLE}
            where email = $1
              and environment = $2
            limit 1
          `,
          [normalizedEmail, normalizedEnvironment],
        );
        row = result.rows?.[0] || null;
      } catch (error: any) {
        throw new Error(
          `User feature flags read failed (${error.message})`,
        );
      }

      if (!row) return null;
      return {
        email: normalizeUserEmail(row.email),
        environment: normalizeFeatureFlagEnvironment(row.environment),
        flags: normalizeFeatureFlags(row.flags),
        updatedAt: row.updated_at || "",
      };
    },

    async upsertFlagsByEmail({ email, environment, flags }: UserFeatureFlagsRecord = {}) {
      const normalizedEmail = normalizeUserEmail(email);
      if (!normalizedEmail) return null;
      const normalizedEnvironment = normalizeFeatureFlagEnvironment(
        environment || defaultEnvironment,
      );

      let row = null;
      try {
        const result = await queryClient.query<UserFeatureFlagsRecord>(
          `
            insert into ${USER_FEATURE_FLAGS_TABLE} (
              email,
              environment,
              flags,
              updated_at
            )
            values ($1, $2, $3::jsonb, timezone('utc', now()))
            on conflict (email, environment)
            do update set
              flags = excluded.flags,
              updated_at = excluded.updated_at
            returning ${SELECT_COLUMNS}
          `,
          [normalizedEmail, normalizedEnvironment, normalizeFeatureFlags(flags)],
        );
        row = result.rows?.[0] || null;
      } catch (error: any) {
        throw new Error(
          `User feature flags upsert failed (${error.message})`,
        );
      }

      return {
        email: normalizeUserEmail(row?.email),
        environment: normalizeFeatureFlagEnvironment(row?.environment),
        flags: normalizeFeatureFlags(row?.flags),
        updatedAt: row?.updated_at || "",
      };
    },

    async deleteFlagsByEmail(email: unknown, options: UserFeatureFlagsRecord = {}) {
      const normalizedEmail = normalizeUserEmail(email);
      if (!normalizedEmail) return null;
      const normalizedEnvironment = normalizeFeatureFlagEnvironment(
        options.environment || defaultEnvironment,
      );

      try {
        await queryClient.query(
          `
            delete from ${USER_FEATURE_FLAGS_TABLE}
            where email = $1
              and environment = $2
          `,
          [normalizedEmail, normalizedEnvironment],
        );
      } catch (error: any) {
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
  queryClient,
  createPoolImpl,
}: {
  env?: Record<string, string | undefined>;
  queryClient?: PostgresQueryClient | null;
  createPoolImpl?: any;
} = {}) {
  return createUserFeatureFlagsRepository({
    environment: resolveFeatureFlagEnvironment(env),
    queryClient:
      queryClient === undefined
        ? createPostgresQueryClientFromEnv({ env, createPoolImpl })
        : queryClient,
  });
}
