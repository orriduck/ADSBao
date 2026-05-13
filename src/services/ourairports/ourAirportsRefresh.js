// Stale-while-revalidate orchestrator for the OurAirports cache in Supabase.
// The Next.js routes call `scheduleRefreshIfDue` from a post-response hook
// (`after()`); the read path never blocks on a network refresh. A singleton
// row in `public.ourairports_refresh_meta` acts as a soft lock so concurrent
// triggers don't fan out into N parallel CSV pulls.

import { createClient } from "@supabase/supabase-js";

import { createOurAirportsImporter } from "./ourAirportsImporter.js";

export const REFRESH_TTL_MS = 24 * 60 * 60 * 1000;
const LOCK_TIMEOUT_MS = 10 * 60 * 1000;
const META_TABLE = "ourairports_refresh_meta";
const META_ID = "singleton";

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
    .select(
      "last_imported_at,last_attempted_at,last_status,last_error,airports_count,runways_count,frequencies_count,navaids_count",
    )
    .eq("id", META_ID)
    .maybeSingle();
  if (error) {
    throw new Error(`Refresh meta read failed: ${error.message}`);
  }
  return data || null;
};

export const isRefreshDue = (meta, ttlMs = REFRESH_TTL_MS, now = Date.now()) => {
  if (!meta) return true;
  if (!meta.last_imported_at) return true;
  const last = Date.parse(meta.last_imported_at);
  if (!Number.isFinite(last)) return true;
  return now - last >= ttlMs;
};

const isLockHeld = (meta, now = Date.now(), timeoutMs = LOCK_TIMEOUT_MS) => {
  if (!meta?.last_attempted_at) return false;
  const startedAt = Date.parse(meta.last_attempted_at);
  if (!Number.isFinite(startedAt)) return false;
  return now - startedAt < timeoutMs && meta.last_status !== "success" && meta.last_status !== "error";
};

const tryAcquireLock = async (client, { now = Date.now(), timeoutMs = LOCK_TIMEOUT_MS } = {}) => {
  const horizon = new Date(now - timeoutMs).toISOString();
  const { data, error } = await client
    .from(META_TABLE)
    .update({
      last_attempted_at: nowIso(),
      last_status: "in_progress",
      last_error: "",
      updated_at: nowIso(),
    })
    .eq("id", META_ID)
    .or(
      `last_attempted_at.is.null,last_attempted_at.lt.${horizon},last_status.eq.success,last_status.eq.error`,
    )
    .select("id");
  if (error) {
    throw new Error(`Refresh lock acquire failed: ${error.message}`);
  }
  return (data || []).length > 0;
};

const recordSuccess = async (client, counts) => {
  await client
    .from(META_TABLE)
    .update({
      last_imported_at: nowIso(),
      last_status: "success",
      last_error: "",
      airports_count: counts.airports || 0,
      runways_count: counts.runways || 0,
      frequencies_count: counts.frequencies || 0,
      navaids_count: counts.navaids || 0,
      updated_at: nowIso(),
    })
    .eq("id", META_ID);
};

const recordFailure = async (client, error) => {
  try {
    await client
      .from(META_TABLE)
      .update({
        last_status: "error",
        last_error: String(error?.message || error).slice(0, 500),
        updated_at: nowIso(),
      })
      .eq("id", META_ID);
  } catch {
    // best-effort — don't mask the underlying error
  }
};

export const runRefreshWithLock = async ({
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
  if (!isRefreshDue(meta)) return { ran: false, reason: "fresh" };
  if (isLockHeld(meta)) return { ran: false, reason: "locked" };

  const acquired = await tryAcquireLock(client);
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
    const counts = await importer.import();
    await recordSuccess(client, counts);
    return { ran: true, counts };
  } catch (error) {
    await recordFailure(client, error);
    throw error;
  }
};

// Fire-and-forget helper for the route layer. Swallows errors (logged at
// service level) so the user-facing route never sees a refresh failure.
export const scheduleRefreshIfDue = async (options = {}) => {
  try {
    const result = await runRefreshWithLock(options);
    if (result.ran) {
      console.log("[ourairports-refresh] completed", result.counts);
    } else if (result.reason !== "fresh" && result.reason !== "no_service_role") {
      console.log("[ourairports-refresh] skipped:", result.reason);
    }
  } catch (error) {
    console.warn("[ourairports-refresh] failed:", error);
  }
};
