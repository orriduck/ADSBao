import { createServerSupabaseClient } from "./supabaseClient.js";

export const ROUTE_FEEDBACK_TABLE = "flight_route_feedback_reports";

const ACTIVE_STATUS = "active";

const SELECT_COLUMNS = [
  "id",
  "cache_key",
  "normalized_callsign",
  "target_airport_icao",
  "target_airport_iata",
  "origin_icao",
  "destination_icao",
  "aircraft_hex",
  "aircraft_type",
  "feedback_reason",
  "prior_route_payload",
  "route_payload",
  "status",
  "created_at",
  "expires_at",
  "deleted_at",
].join(",");

export function createRouteFeedbackReportsRepository({
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
    // Newest active, non-expired, non-soft-deleted feedback override for
    // a callsign. We deliberately ignore cache_key on read: the stored key
    // (callsign + airport context) is retained for analysis, but a
    // correction the user submitted while looking at KBOS should also win
    // on /aircraft/DAL977 where there is no airport context to namespace
    // against. The handler treats a hit as "use this route instead of
    // asking adsbdb" — see the lookup order in flightRoutes.mechanism.js.
    async readActiveOverride({ normalizedCallsign }) {
      if (!normalizedCallsign) return null;

      const { data, error } = await client
        .from(ROUTE_FEEDBACK_TABLE)
        .select(SELECT_COLUMNS)
        .eq("normalized_callsign", normalizedCallsign)
        .eq("status", ACTIVE_STATUS)
        .is("deleted_at", null)
        .gt("expires_at", new Date(now()).toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw new Error(
          `Route feedback override read failed (${error.message})`,
        );
      }

      return data || null;
    },

    async writeFeedbackReport({
      cacheKey,
      normalizedCallsign,
      targetAirportIcao = "",
      targetAirportIata = "",
      originIcao,
      destinationIcao,
      aircraftHex = "",
      aircraftType = "",
      userHash = "",
      feedbackReason,
      priorRoutePayload = null,
      routePayload,
      createdAt,
      expiresAt,
    } = {}) {
      const row = {
        cache_key: cacheKey,
        normalized_callsign: normalizedCallsign,
        target_airport_icao: targetAirportIcao || null,
        target_airport_iata: targetAirportIata || null,
        origin_icao: originIcao,
        destination_icao: destinationIcao,
        aircraft_hex: aircraftHex || null,
        aircraft_type: aircraftType || null,
        user_hash: userHash || null,
        feedback_reason: feedbackReason,
        prior_route_payload: priorRoutePayload,
        route_payload: routePayload,
        status: ACTIVE_STATUS,
        created_at: createdAt,
        expires_at: expiresAt,
        deleted_at: null,
      };

      const { data, error } = await client
        .from(ROUTE_FEEDBACK_TABLE)
        .insert(row)
        .select(SELECT_COLUMNS)
        .single();

      if (error) {
        throw new Error(
          `Route feedback write failed (${error.message})`,
        );
      }
      return data;
    },
  };
}

export function createRouteFeedbackReportsRepositoryFromEnv({
  env = process.env,
  createClientImpl,
  now = Date.now,
} = {}) {
  return createRouteFeedbackReportsRepository({
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
