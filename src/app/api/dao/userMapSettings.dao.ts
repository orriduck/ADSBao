import {
  createPostgresQueryClientFromEnv,
  type PostgresQueryClient,
} from "./postgresClient";
import {
  normalizeFeatureFlagEnvironment,
  normalizeUserEmail,
  resolveFeatureFlagEnvironment,
} from "../../../features/app-shell/feature-flags/userFeatureFlagsModel";
import {
  DEFAULT_MAP_SETTINGS,
  mergeMapSettings,
  normalizeMapSettings,
  normalizeMapSettingsDevice,
} from "../../../features/airport/map-settings/mapSettingsModel";

const USER_MAP_SETTINGS_TABLE = "user_map_settings";
const SELECT_COLUMNS = "email,environment,device,settings,has_selected_mode,updated_at";

type UserMapSettingsRecord = Record<string, any>;

function createUserMapSettingsRepository({
  environment,
  queryClient,
}: {
  environment?: unknown;
  queryClient?: PostgresQueryClient | null;
} = {}) {
  if (!queryClient) return null;
  const defaultEnvironment = normalizeFeatureFlagEnvironment(environment);

  return {
    async readSettingsByEmail(email: unknown, options: UserMapSettingsRecord = {}) {
      const normalizedEmail = normalizeUserEmail(email);
      if (!normalizedEmail) return null;
      const normalizedEnvironment = normalizeFeatureFlagEnvironment(
        options.environment || defaultEnvironment,
      );
      const normalizedDevice = normalizeMapSettingsDevice(options.device);

      let row = null;
      try {
        const result = await queryClient.query<UserMapSettingsRecord>(
          `
            select ${SELECT_COLUMNS}
            from ${USER_MAP_SETTINGS_TABLE}
            where email = $1
              and environment = $2
              and device = $3
            limit 1
          `,
          [normalizedEmail, normalizedEnvironment, normalizedDevice],
        );
        row = result.rows?.[0] || null;
      } catch (error: any) {
        throw new Error(`User map settings read failed (${error.message})`);
      }

      if (!row) return null;
      return {
        email: normalizeUserEmail(row.email),
        environment: normalizeFeatureFlagEnvironment(row.environment),
        device: normalizeMapSettingsDevice(row.device),
        settings: normalizeMapSettings({
          ...row.settings,
          hasSelectedMode: row.has_selected_mode,
        }),
        updatedAt: row.updated_at || "",
      };
    },

    async upsertSettingsByEmail({
      email,
      environment,
      device,
      settings,
    }: UserMapSettingsRecord = {}) {
      const normalizedEmail = normalizeUserEmail(email);
      if (!normalizedEmail) return null;
      const normalizedEnvironment = normalizeFeatureFlagEnvironment(
        environment || defaultEnvironment,
      );
      const normalizedDevice = normalizeMapSettingsDevice(device);
      const existingRow = await this.readSettingsByEmail(normalizedEmail, {
        environment: normalizedEnvironment,
        device: normalizedDevice,
      });
      const normalizedSettings = mergeMapSettings({
        settings: existingRow?.settings || DEFAULT_MAP_SETTINGS,
        updates: settings,
      });
      const updatedAt = normalizedSettings.updatedAt || new Date().toISOString();

      let row = null;
      try {
        const result = await queryClient.query<UserMapSettingsRecord>(
          `
            insert into ${USER_MAP_SETTINGS_TABLE} (
              email,
              environment,
              device,
              settings,
              has_selected_mode,
              updated_at
            )
            values ($1, $2, $3, $4::jsonb, $5, $6)
            on conflict (email, environment, device)
            do update set
              settings = excluded.settings,
              has_selected_mode = excluded.has_selected_mode,
              updated_at = excluded.updated_at
            returning ${SELECT_COLUMNS}
          `,
          [
            normalizedEmail,
            normalizedEnvironment,
            normalizedDevice,
            {
              ...normalizedSettings,
              updatedAt,
            },
            normalizedSettings.hasSelectedMode === true,
            updatedAt,
          ],
        );
        row = result.rows?.[0] || null;
      } catch (error: any) {
        throw new Error(`User map settings upsert failed (${error.message})`);
      }

      return {
        email: normalizeUserEmail(row?.email),
        environment: normalizeFeatureFlagEnvironment(row?.environment),
        device: normalizeMapSettingsDevice(row?.device),
        settings: normalizeMapSettings({
          ...row?.settings,
          hasSelectedMode: row?.has_selected_mode,
        }),
        updatedAt: row?.updated_at || "",
      };
    },
  };
}

export function createUserMapSettingsRepositoryFromEnv({
  env = process.env,
  queryClient,
  createPoolImpl,
}: {
  env?: Record<string, string | undefined>;
  queryClient?: PostgresQueryClient | null;
  createPoolImpl?: any;
} = {}) {
  return createUserMapSettingsRepository({
    environment: resolveFeatureFlagEnvironment(env),
    queryClient:
      queryClient === undefined
        ? createPostgresQueryClientFromEnv({ env, createPoolImpl })
        : queryClient,
  });
}
