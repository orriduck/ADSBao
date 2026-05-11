import { createClient } from "@supabase/supabase-js";

import { toFiniteNumber } from "../../utils/math.js";

const TABLE_NAME = "airport_metadata_cache";
const AIRPORT_METADATA_COLUMNS =
  "airport_key,icao,iata,code,name,city,state,country,type,type_label,lat,lon,elevation_ft,source,metadata,expires_at";

export const AIRPORT_METADATA_SUPABASE_CACHE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

const cleanString = (value) => String(value || "").trim();
const cleanUpper = (value) => cleanString(value).toUpperCase();

export function airportMetadataKey(airport) {
  return cleanUpper(airport?.icao || airport?.code || airport?.iata || airport?.name);
}

export function normalizeAirportMetadataRow(airport) {
  const airportKey = airportMetadataKey(airport);
  const lat = toFiniteNumber(airport?.lat);
  const lon = toFiniteNumber(airport?.lon);
  if (!airportKey || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const icao = cleanUpper(airport?.icao || airport?.code || airportKey);
  const code = cleanUpper(airport?.code || icao || airportKey);

  return {
    airport_key: airportKey,
    icao,
    iata: cleanUpper(airport?.iata),
    code,
    name: cleanString(airport?.name || code),
    city: cleanString(airport?.city),
    state: cleanUpper(airport?.state),
    country: cleanUpper(airport?.country),
    type: cleanString(airport?.type),
    type_label: cleanString(airport?.type_label),
    lat,
    lon,
    elevation_ft: toFiniteNumber(airport?.elevationFt ?? airport?.elevation_ft),
    source: cleanString(airport?.source),
    metadata: airport?.metadata && typeof airport.metadata === "object" ? airport.metadata : {},
  };
}

export function normalizeAirportMetadataAirport(row) {
  if (!row) return null;
  return {
    icao: row.icao || row.code || row.airport_key,
    iata: row.iata || "",
    code: row.code || row.icao || row.airport_key,
    name: row.name || row.icao || row.airport_key,
    city: row.city || "",
    state: row.state || "",
    country: row.country || "",
    type: row.type || "",
    type_label: row.type_label || "",
    lat: toFiniteNumber(row.lat),
    lon: toFiniteNumber(row.lon),
    elevationFt: toFiniteNumber(row.elevation_ft),
    source: row.source || "supabase",
    ...(row.metadata && typeof row.metadata === "object" ? row.metadata : {}),
  };
}

export function createAirportMetadataSupabaseCache({
  supabaseUrl,
  supabaseKey,
  createClientImpl = createClient,
  now = Date.now,
} = {}) {
  if (!supabaseUrl || !supabaseKey || !createClientImpl) return null;

  const client = createClientImpl(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  return {
    async read(code) {
      const key = cleanUpper(code);
      if (!key) return null;

      const { data, error } = await client
        .from(TABLE_NAME)
        .select(AIRPORT_METADATA_COLUMNS)
        .eq("airport_key", key)
        .gt("expires_at", new Date(now()).toISOString())
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(`Supabase airport metadata cache read failed (${error.message})`);
      }

      return normalizeAirportMetadataAirport(data);
    },

    async writeMany(airports = []) {
      const expiresAt = new Date(
        now() + AIRPORT_METADATA_SUPABASE_CACHE_TTL_MS,
      ).toISOString();
      const rows = airports
        .map(normalizeAirportMetadataRow)
        .filter(Boolean)
        .map((row) => ({ ...row, expires_at: expiresAt }));

      if (rows.length === 0) return;

      const { error } = await client
        .from(TABLE_NAME)
        .upsert(rows, { onConflict: "airport_key" });

      if (error) {
        throw new Error(`Supabase airport metadata cache write failed (${error.message})`);
      }
    },
  };
}

export function createAirportMetadataSupabaseCacheFromEnv({
  env = process.env,
  createClientImpl = createClient,
  now = Date.now,
} = {}) {
  return createAirportMetadataSupabaseCache({
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
