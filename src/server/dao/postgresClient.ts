import pg from "pg";

const { Pool } = pg;

type QueryResult<T = Record<string, any>> = {
  rows: T[];
  rowCount: number | null;
};

export type PostgresQueryClient = {
  options?: Record<string, any>;
  query<T = Record<string, any>>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<T>>;
  dispose?: () => Promise<void>;
};

type PoolLike = {
  query<T = Record<string, any>>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<T>>;
  end?: () => Promise<void>;
};

type CreatePoolImpl = (options: Record<string, any>) => PoolLike;

const databaseUrlFromEnv = (env: Record<string, string | undefined>) =>
  env.ADSBAO_DATABASE_URL || env.DATABASE_URL || "";

const shouldDisableSsl = (
  connectionString: string,
  env: Record<string, string | undefined>,
) => {
  const sslMode = String(env.PGSSLMODE || "").trim().toLowerCase();
  if (sslMode === "disable") return true;
  return /@(localhost|127\.0\.0\.1|\[::1\])(?::|\/)/i.test(connectionString);
};

const poolMaxFromEnv = (env: Record<string, string | undefined>) => {
  const parsed = Number(env.PGPOOL_MAX);
  if (!Number.isFinite(parsed)) return 5;
  return Math.max(1, Math.min(Math.floor(parsed), 20));
};

export function createPostgresQueryClientFromEnv({
  env = process.env,
  createPoolImpl = (options) => new Pool(options),
}: {
  env?: Record<string, string | undefined>;
  createPoolImpl?: CreatePoolImpl;
} = {}): PostgresQueryClient | null {
  const connectionString = databaseUrlFromEnv(env);
  if (!connectionString) return null;

  const options = {
    connectionString,
    max: poolMaxFromEnv(env),
    ssl: shouldDisableSsl(connectionString, env)
      ? false
      : { rejectUnauthorized: false },
  };
  const pool = createPoolImpl(options);

  return {
    options,
    query(text, values = []) {
      return pool.query(text, values);
    },
    async dispose() {
      await pool.end?.();
    },
  };
}
