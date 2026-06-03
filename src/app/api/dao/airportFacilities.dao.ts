import { createServerSupabaseClient } from "./supabaseClient";

type AirportFacilityRecord = Record<string, any>;

export const AIRPORT_FREQUENCIES_TABLE = "airport_frequencies";
export const NAVAIDS_TABLE = "navaids";

const AIRPORT_FREQUENCY_COLUMNS = [
  "id",
  "airport_ref",
  "airport_ident",
  "type",
  "description",
  "frequency_mhz",
].join(",");

const NAVAID_COLUMNS = [
  "id",
  "filename",
  "ident",
  "name",
  "type",
  "frequency_khz",
  "latitude_deg",
  "longitude_deg",
  "elevation_ft",
  "iso_country",
  "dme_frequency_khz",
  "dme_channel",
  "dme_latitude_deg",
  "dme_longitude_deg",
  "dme_elevation_ft",
  "slaved_variation_deg",
  "magnetic_variation_deg",
  "usage_type",
  "power",
  "associated_airport",
].join(",");

const NM_PER_LAT_DEGREE = 60;

const normalizeIdent = (value: unknown) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const numberOrNull = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const normalizeSourceRow = (row: AirportFacilityRecord = {}) => ({
  ...row,
  source: "ourairports",
});

const mapFrequencyRow = (row: AirportFacilityRecord | null | undefined) => {
  if (!row) return null;
  return normalizeSourceRow({
    id: row.id,
    airportRef: row.airport_ref,
    airportIdent: normalizeIdent(row.airport_ident),
    type: row.type || "",
    description: row.description || "",
    frequencyMhz: numberOrNull(row.frequency_mhz),
  });
};

const mapNavaidRow = (row: AirportFacilityRecord | null | undefined) => {
  if (!row) return null;
  return normalizeSourceRow({
    id: row.id,
    filename: row.filename || "",
    ident: normalizeIdent(row.ident),
    name: row.name || "",
    type: row.type || "",
    frequencyKhz: numberOrNull(row.frequency_khz),
    lat: numberOrNull(row.latitude_deg),
    lon: numberOrNull(row.longitude_deg),
    elevationFt: numberOrNull(row.elevation_ft),
    country: row.iso_country || "",
    dme: {
      frequencyKhz: numberOrNull(row.dme_frequency_khz),
      channel: row.dme_channel || "",
      lat: numberOrNull(row.dme_latitude_deg),
      lon: numberOrNull(row.dme_longitude_deg),
      elevationFt: numberOrNull(row.dme_elevation_ft),
    },
    slavedVariationDeg: numberOrNull(row.slaved_variation_deg),
    magneticVariationDeg: numberOrNull(row.magnetic_variation_deg),
    usageType: row.usage_type || "",
    power: row.power || "",
    associatedAirport: normalizeIdent(row.associated_airport),
  });
};

const boundingBoxForAirport = ({
  lat,
  lon,
  radiusNm,
}: AirportFacilityRecord = {}) => {
  const centerLat = numberOrNull(lat);
  const centerLon = numberOrNull(lon);
  const radius = Math.max(1, Math.min(Number(radiusNm) || 60, 250));
  if (centerLat == null || centerLon == null) return null;

  const latDelta = radius / NM_PER_LAT_DEGREE;
  const lonNmPerDegree =
    NM_PER_LAT_DEGREE * Math.max(0.2, Math.cos((centerLat * Math.PI) / 180));
  const lonDelta = radius / lonNmPerDegree;
  return {
    south: centerLat - latDelta,
    north: centerLat + latDelta,
    west: centerLon - lonDelta,
    east: centerLon + lonDelta,
  };
};

export function createAirportFacilityRepository({
  supabaseUrl,
  supabaseKey,
  createClientImpl,
}: {
  supabaseUrl?: string;
  supabaseKey?: string;
  createClientImpl?: any;
} = {}) {
  const client = createServerSupabaseClient({
    supabaseUrl,
    supabaseKey,
    createClientImpl,
  });
  if (!client) return null;

  return {
    async readFrequenciesByAirportIdent(ident: unknown) {
      const airportIdent = normalizeIdent(ident);
      if (!airportIdent) return [];

      const { data, error } = await client
        .from(AIRPORT_FREQUENCIES_TABLE)
        .select(AIRPORT_FREQUENCY_COLUMNS)
        .eq("airport_ident", airportIdent)
        .order("type", { ascending: true })
        .order("frequency_mhz", { ascending: true });

      if (error) {
        throw new Error(`Airport frequencies read failed (${error.message})`);
      }

      return (data || []).map(mapFrequencyRow).filter(Boolean);
    },

    async readNavaidsNearAirport({
      lat,
      lon,
      radiusNm = 60,
      limit = 50,
    }: AirportFacilityRecord = {}) {
      const bounds = boundingBoxForAirport({ lat, lon, radiusNm });
      if (!bounds) return [];
      const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 100));

      const { data, error } = await client
        .from(NAVAIDS_TABLE)
        .select(NAVAID_COLUMNS)
        .gte("latitude_deg", bounds.south)
        .lte("latitude_deg", bounds.north)
        .gte("longitude_deg", bounds.west)
        .lte("longitude_deg", bounds.east)
        .order("ident", { ascending: true })
        .limit(safeLimit);

      if (error) {
        throw new Error(`Navaids read failed (${error.message})`);
      }

      return (data || []).map(mapNavaidRow).filter(Boolean);
    },

    async readNavaidsInBounds({
      bbox,
      limit = 250,
    }: AirportFacilityRecord = {}) {
      if (!bbox) return [];
      const south = numberOrNull(bbox.south);
      const north = numberOrNull(bbox.north);
      const west = numberOrNull(bbox.west);
      const east = numberOrNull(bbox.east);
      if (south == null || north == null || west == null || east == null) {
        return [];
      }
      const safeLimit = Math.max(1, Math.min(Number(limit) || 250, 500));

      const { data, error } = await client
        .from(NAVAIDS_TABLE)
        .select(NAVAID_COLUMNS)
        .gte("latitude_deg", Math.min(south, north))
        .lte("latitude_deg", Math.max(south, north))
        .gte("longitude_deg", Math.min(west, east))
        .lte("longitude_deg", Math.max(west, east))
        .order("ident", { ascending: true })
        .limit(safeLimit);

      if (error) {
        throw new Error(`Navaid tile read failed (${error.message})`);
      }

      return (data || []).map(mapNavaidRow).filter(Boolean);
    },

    async readNavaidCountInBounds({
      bbox,
    }: AirportFacilityRecord = {}) {
      if (!bbox) return 0;
      const south = numberOrNull(bbox.south);
      const north = numberOrNull(bbox.north);
      const west = numberOrNull(bbox.west);
      const east = numberOrNull(bbox.east);
      if (south == null || north == null || west == null || east == null) {
        return 0;
      }

      const { count, error } = await client
        .from(NAVAIDS_TABLE)
        .select("id", { count: "exact", head: true })
        .gte("latitude_deg", Math.min(south, north))
        .lte("latitude_deg", Math.max(south, north))
        .gte("longitude_deg", Math.min(west, east))
        .lte("longitude_deg", Math.max(west, east));

      if (error) {
        throw new Error(`Navaid count tile read failed (${error.message})`);
      }

      return Math.max(0, Number(count) || 0);
    },
  };
}

export function createAirportFacilityRepositoryFromEnv({
  env = process.env,
  createClientImpl,
}: {
  env?: Record<string, string | undefined>;
  createClientImpl?: any;
} = {}) {
  return createAirportFacilityRepository({
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL,
    supabaseKey:
      env.SUPABASE_SECRET_KEY ||
      env.SUPABASE_SERVICE_ROLE_KEY ||
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      env.SUPABASE_PUBLISHABLE_KEY,
    createClientImpl,
  });
}
