// Stale-while-revalidate orchestrator for the OurAirports cache in Supabase.
// The Next.js routes call `scheduleRefreshIfDue` from a post-response hook
// (`after()`); the read path never blocks on a network refresh.
//
// Each invocation refreshes at most ONE table so a single function call stays
// well under Vercel's per-function timeout. A singleton row in
// `public.ourairports_refresh_meta` tracks per-table `*_imported_at`
// timestamps and acts as a soft lock so concurrent staleness triggers don't
// fan out into parallel imports of the same table.

import { createClient } from "@supabase/supabase-js";

import {
  OUR_AIRPORTS_TABLE_ORDER,
  OUR_AIRPORTS_TABLES,
  createOurAirportsImporter,
} from "./ourAirportsImporter.js";

export const REFRESH_TTL_MS = 24 * 60 * 60 * 1000;
const LOCK_TIMEOUT_MS = 10 * 60 * 1000;
const META_TABLE = "ourairports_refresh_meta";
const META_ID = "singleton";

const META_COLUMNS =
  "last_imported_at,airports_imported_at,runways_imported_at,frequencies_imported_at,navaids_imported_at,last_attempted_at,last_status,last_error,airports_count,runways_count,frequencies_count,navaids_count";

const TABLE_TIMESTAMP_COLUMNS = Object.freeze({
  airports: "airports_imported_at",
  runways: "runways_imported_at",
  frequencies: "frequencies_imported_at",
  navaids: "navaids_imported_at",
});

const TABLE_COUNT_COLUMNS = Object.freeze({
  airports: "airports_count",
  runways: "runways_count",
  frequencies: "frequencies_count",
  navaids: "navaids_count",
});

const nowIso = () => new Date().toISOString();

const adminClientFromEnv = (env = process.env, createClientImpl = createClient) => {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClientImpl(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
};

export const readRefreshMeta = async (client) => {
  if (!client) return null;
  const { data, error } = await client
    .from(META_TABLE)
    .select(META_COLUMNS)
    .eq("id", META_ID)
    .maybeSingle();
  if (error) {
    throw new Error(`Refresh meta read failed: ${error.message}`);
  }
  return data || null;
};

// Returns the next table key that's past TTL, in priority order (airports
// first because runways/frequencies/navaids reference it). Null when every
// table is fresh.
export const pickNextStaleTable = (meta, ttlMs = REFRESH_TTL_MS, now = Date.now()) => {
  for (const key of OUR_AIRPORTS_TABLE_ORDER) {
    const column = TABLE_TIMESTAMP_COLUMNS[key];
    const raw = meta?.[column];
    if (!raw) return key;
    const last = Date.parse(raw);
    if (!Number.isFinite(last)) return key;
    if (now - last >= ttlMs) return key;
  }
  return null;
};

const isLockHeld = (meta, now = Date.now(), timeoutMs = LOCK_TIMEOUT_MS) => {
  if (!meta?.last_attempted_at) return false;
  const startedAt = Date.parse(meta.last_attempted_at);
  if (!Number.isFinite(startedAt)) return false;
  if (meta.last_status === "success" || meta.last_status === "error") return false;
  return now - startedAt < timeoutMs;
};

const tryAcquireLock = async (client, tableKey, { now = Date.now(), timeoutMs = LOCK_TIMEOUT_MS } = {}) => {
  const horizon = new Date(now - timeoutMs).toISOString();
  const { data, error } = await client
    .from(META_TABLE)
    .update({
      last_attempted_at: nowIso(),
      last_status: `in_progress:${tableKey}`,
      last_error: "",
      updated_at: nowIso(),
    })
    .eq("id", META_ID)
    .or(
      `last_attempted_at.is.null,last_attempted_at.lt.${horizon},last_status.eq.success,last_status.like.error%`,
    )
    .select("id");
  if (error) {
    throw new Error(`Refresh lock acquire failed: ${error.message}`);
  }
  return (data || []).length > 0;
};

const recordSuccess = async (client, tableKey, count) => {
  const timestampColumn = TABLE_TIMESTAMP_COLUMNS[tableKey];
  const countColumn = TABLE_COUNT_COLUMNS[tableKey];
  const stamp = nowIso();
  await client
    .from(META_TABLE)
    .update({
      [timestampColumn]: stamp,
      [countColumn]: count,
      last_imported_at: stamp,
      last_status: "success",
      last_error: "",
      updated_at: stamp,
    })
    .eq("id", META_ID);
};

const recordFailure = async (client, tableKey, error) => {
  try {
    await client
      .from(META_TABLE)
      .update({
        last_status: `error:${tableKey}`,
        last_error: String(error?.message || error).slice(0, 500),
        updated_at: nowIso(),
      })
      .eq("id", META_ID);
  } catch {
    // best-effort — don't mask the underlying error
  }
};

// Refresh at most one stale table. Returns metadata about what (if anything)
// ran so the caller / tests can assert.
export const runRefreshStepWithLock = async ({
  env = process.env,
  fetchImpl = globalThis.fetch?.bind(globalThis),
  createClientImpl = createClient,
  log = () => {},
  importerFactory = createOurAirportsImporter,
} = {}) => {
  const client = adminClientFromEnv(env, createClientImpl);
  if (!client) return { ran: false, reason: "no_service_role" };

  let meta;
  try {
    meta = await readRefreshMeta(client);
  } catch (error) {
    return { ran: false, reason: "meta_unavailable", error: error.message };
  }
  const tableKey = pickNextStaleTable(meta);
  if (!tableKey) return { ran: false, reason: "fresh" };
  if (isLockHeld(meta)) return { ran: false, reason: "locked" };
  if (!OUR_AIRPORTS_TABLES[tableKey]) {
    return { ran: false, reason: "unknown_table" };
  }

  const acquired = await tryAcquireLock(client, tableKey);
  if (!acquired) return { ran: false, reason: "locked" };

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;
  const importer = importerFactory({
    supabaseUrl,
    supabaseKey,
    createClientImpl,
    fetchImpl,
    log,
  });

  try {
    const count = await importer.importTable(tableKey);
    await recordSuccess(client, tableKey, count);
    return { ran: true, table: tableKey, count };
  } catch (error) {
    await recordFailure(client, tableKey, error);
    throw error;
  }
};

// Fire-and-forget helper for the route layer. Swallows errors (logged at
// service level) so the user-facing route never sees a refresh failure.
export const scheduleRefreshIfDue = async (options = {}) => {
  try {
    const result = await runRefreshStepWithLock(options);
    if (result.ran) {
      console.log(
        `[ourairports-refresh] refreshed ${result.table} (${result.count} rows)`,
      );
    } else if (result.reason !== "fresh" && result.reason !== "no_service_role") {
      console.log("[ourairports-refresh] skipped:", result.reason);
    }
  } catch (error) {
    console.warn("[ourairports-refresh] failed:", error);
  }
};
