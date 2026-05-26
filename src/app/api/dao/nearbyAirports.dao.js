import { toFiniteNumber } from "../../../utils/math.js";
import { createServerSupabaseClient } from "./supabaseClient.js";

const TABLE_NAME = "nearby_airport_cache";

export const NEARBY_AIRPORT_SUPABASE_CACHE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

const roundedNumber = (value, precision = 6) => {
  const number = toFiniteNumber(value);
  if (!Number.isFinite(number)) return "";
  const rounded = number.toFixed(precision);
  return precision === 0 ? rounded : rounded.replace(/\.?0+$/, "");
};

export function buildNearbyAirportCacheKey({
  lat,
  lon,
  icao = "",
  radiusNm,
  limit,
  country = "US",
  minRunwayLength,
} = {}) {
  return [
    "nearby-airports-v6",
    String(country || "").trim().toUpperCase(),
    roundedNumber(minRunwayLength, 0),
    String(icao || "").trim().toUpperCase(),
    roundedNumber(lat),
    roundedNumber(lon),
    roundedNumber(radiusNm, 2),
    roundedNumber(limit, 0),
  ].join(":");
}

export function createNearbyAirportSupabaseCache({
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
    async read(cacheKey) {
      const { data, error } = await client
        .from(TABLE_NAME)
        .select("response,expires_at")
        .eq("cache_key", cacheKey)
        .gt("expires_at", new Date(now()).toISOString())
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(
          `Supabase nearby airport cache read failed (${error.message})`,
        );
      }

      return data?.response || null;
    },

    async write({ cacheKey, query, response }) {
      const expiresAt = new Date(
        now() + NEARBY_AIRPORT_SUPABASE_CACHE_TTL_MS,
      ).toISOString();

      const { error } = await client.from(TABLE_NAME).upsert(
        {
          cache_key: cacheKey,
          query,
          response,
          expires_at: expiresAt,
        },
        { onConflict: "cache_key" },
      );

      if (error) {
        throw new Error(
          `Supabase nearby airport cache write failed (${error.message})`,
        );
      }
    },
  };
}

export function createNearbyAirportSupabaseCacheFromEnv({
  env = process.env,
  createClientImpl,
  now = Date.now,
} = {}) {
  return createNearbyAirportSupabaseCache({
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL,
    supabaseKey:
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      env.SUPABASE_PUBLISHABLE_KEY ||
      env.SUPABASE_SECRET_KEY ||
      env.SUPABASE_SERVICE_ROLE_KEY,
    createClientImpl,
    now,
  });
}
