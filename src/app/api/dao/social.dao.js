import { createServerSupabaseClient } from "./supabaseClient.js";
import {
  SOCIAL_ACTIVE_WINDOW_MS,
  buildSocialSummary,
} from "../../../features/social/socialModel.js";

export const SOCIAL_PRESENCE_TABLE = "social_presence";
export const SOCIAL_REACTIONS_TABLE = "social_reactions";

const REACTION_SELECT_COLUMNS = "id,deleted_at";

const isoNow = (now) => new Date(now()).toISOString();

const applyEntityFilters = (query, {
  entityType,
  entityKey,
  contextAirportIcao = "",
} = {}) =>
  query
    .eq("entity_type", entityType)
    .eq("entity_key", entityKey)
    .eq("context_airport_icao", contextAirportIcao || "");

export function createSocialRepository({
  supabaseUrl,
  supabaseKey,
  createClientImpl,
  now = Date.now,
} = {}) {
  const client = createServerSupabaseClient({
    supabaseUrl,
    supabaseKey,
    createClientImpl,
  });
  if (!client) return null;

  return {
    async heartbeatPresence({
      sessionHash,
      entityType,
      entityKey,
      contextAirportIcao = "",
    } = {}) {
      if (!sessionHash || !entityType || !entityKey) return null;
      const seenAt = isoNow(now);
      const row = {
        session_hash: sessionHash,
        entity_type: entityType,
        entity_key: entityKey,
        context_airport_icao: contextAirportIcao || "",
        last_seen_at: seenAt,
        deleted_at: null,
      };

      const { data, error } = await client
        .from(SOCIAL_PRESENCE_TABLE)
        .upsert(row, {
          onConflict: "session_hash,entity_type,entity_key,context_airport_icao",
        })
        .select("session_hash,entity_type,entity_key,context_airport_icao,last_seen_at,deleted_at")
        .single();

      if (error) {
        throw new Error(`Social presence heartbeat failed (${error.message})`);
      }
      return data;
    },

    async toggleReaction({
      sessionHash,
      entityType,
      entityKey,
      contextAirportIcao = "",
      reaction,
    } = {}) {
      if (!sessionHash || !entityType || !entityKey || !reaction) return null;
      const timestamp = isoNow(now);
      const base = {
        session_hash: sessionHash,
        entity_type: entityType,
        entity_key: entityKey,
        context_airport_icao: contextAirportIcao || "",
        reaction,
      };

      const { data: existing, error: readError } = await applyEntityFilters(
        client
          .from(SOCIAL_REACTIONS_TABLE)
          .select(REACTION_SELECT_COLUMNS)
          .eq("session_hash", sessionHash)
          .eq("reaction", reaction),
        base,
      )
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (readError && readError.code !== "PGRST116") {
        throw new Error(`Social reaction read failed (${readError.message})`);
      }

      if (existing?.id) {
        const active = Boolean(existing.deleted_at);
        const row = active
          ? { deleted_at: null, updated_at: timestamp }
          : { deleted_at: timestamp, updated_at: timestamp };
        const { error } = await client
          .from(SOCIAL_REACTIONS_TABLE)
          .update(row)
          .eq("id", existing.id)
          .select(REACTION_SELECT_COLUMNS)
          .single();
        if (error) {
          throw new Error(`Social reaction update failed (${error.message})`);
        }
        return { active, reaction };
      }

      const { error } = await client
        .from(SOCIAL_REACTIONS_TABLE)
        .insert({
          ...base,
          created_at: timestamp,
          updated_at: timestamp,
          deleted_at: null,
        })
        .select(REACTION_SELECT_COLUMNS)
        .single();
      if (error) {
        throw new Error(`Social reaction insert failed (${error.message})`);
      }
      return { active: true, reaction };
    },

    async readSummary({
      sessionHash = "",
      entityType,
      entityKey,
      contextAirportIcao = "",
    } = {}) {
      if (!entityType || !entityKey) return null;
      const activeSince = new Date(now() - SOCIAL_ACTIVE_WINDOW_MS).toISOString();

      const [presenceResult, reactionResult, viewerResult] = await Promise.all([
        applyEntityFilters(
          client.from(SOCIAL_PRESENCE_TABLE).select("session_hash"),
          { entityType, entityKey, contextAirportIcao },
        )
          .is("deleted_at", null)
          .gt("last_seen_at", activeSince),
        applyEntityFilters(
          client.from(SOCIAL_REACTIONS_TABLE).select("reaction"),
          { entityType, entityKey, contextAirportIcao },
        ).is("deleted_at", null),
        sessionHash
          ? applyEntityFilters(
              client
                .from(SOCIAL_REACTIONS_TABLE)
                .select("reaction")
                .eq("session_hash", sessionHash),
              { entityType, entityKey, contextAirportIcao },
            ).is("deleted_at", null)
          : Promise.resolve({ data: [], error: null }),
      ]);

      for (const result of [presenceResult, reactionResult, viewerResult]) {
        if (result.error) {
          throw new Error(`Social summary read failed (${result.error.message})`);
        }
      }

      return buildSocialSummary({
        entityType,
        entityKey,
        watching: presenceResult.data?.length || 0,
        reactionRows: reactionResult.data || [],
        viewerRows: viewerResult.data || [],
      });
    },
  };
}

export function createSocialRepositoryFromEnv({
  env = process.env,
  createClientImpl,
  now = Date.now,
} = {}) {
  return createSocialRepository({
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL,
    supabaseKey:
      env.SUPABASE_SECRET_KEY ||
      env.SUPABASE_SERVICE_ROLE_KEY ||
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      env.SUPABASE_PUBLISHABLE_KEY,
    createClientImpl,
    now,
  });
}
