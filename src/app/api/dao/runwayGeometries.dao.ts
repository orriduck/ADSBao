import { createServerSupabaseClient } from "./supabaseClient";

type RunwayGeometryRecord = Record<string, any>;

const RUNWAY_GEOMETRIES_TABLE = "runway_geometries";

const SELECT_COLUMNS = [
  "source",
  "source_id",
  "airport_ident",
  "length_ft",
  "width_ft",
  "surface",
  "lighted",
  "closed",
  "le_ident",
  "le_latitude_deg",
  "le_longitude_deg",
  "le_elevation_ft",
  "le_heading_deg_t",
  "le_displaced_threshold_ft",
  "he_ident",
  "he_latitude_deg",
  "he_longitude_deg",
  "he_elevation_ft",
  "he_heading_deg_t",
  "he_displaced_threshold_ft",
].join(",");

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

const mapRunwayGeometryRow = (row: RunwayGeometryRecord | null | undefined) => {
  if (!row) return null;
  return {
    source: row.source || "",
    sourceId: row.source_id || "",
    airportIdent: row.airport_ident || "",
    lengthFt: numberOrNull(row.length_ft),
    widthFt: numberOrNull(row.width_ft),
    surface: row.surface || "",
    lighted: Boolean(row.lighted),
    closed: Boolean(row.closed),
    le: {
      ident: row.le_ident || "",
      lat: numberOrNull(row.le_latitude_deg),
      lon: numberOrNull(row.le_longitude_deg),
      elevationFt: numberOrNull(row.le_elevation_ft),
      headingDegT: numberOrNull(row.le_heading_deg_t),
      displacedThresholdFt: numberOrNull(row.le_displaced_threshold_ft),
    },
    he: {
      ident: row.he_ident || "",
      lat: numberOrNull(row.he_latitude_deg),
      lon: numberOrNull(row.he_longitude_deg),
      elevationFt: numberOrNull(row.he_elevation_ft),
      headingDegT: numberOrNull(row.he_heading_deg_t),
      displacedThresholdFt: numberOrNull(row.he_displaced_threshold_ft),
    },
  };
};

function createRunwayGeometryRepository({
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

  const readByAirportIdents = async (idents: unknown[] = []) => {
    const normalizedIdents = [...new Set(idents.map(normalizeIdent).filter(Boolean))];
    if (normalizedIdents.length === 0) return new Map();

    const { data, error } = await client
      .from(RUNWAY_GEOMETRIES_TABLE)
      .select(SELECT_COLUMNS)
      .eq("source", "ourairports")
      .in("airport_ident", normalizedIdents)
      .order("airport_ident", { ascending: true })
      .order("le_ident", { ascending: true });

    if (error) {
      throw new Error(`Runway geometry read failed (${error.message})`);
    }

    const byAirport = new Map();
    for (const row of data || []) {
      const mapped = mapRunwayGeometryRow(row);
      if (!mapped?.airportIdent) continue;
      const current = byAirport.get(mapped.airportIdent) || [];
      current.push(mapped);
      byAirport.set(mapped.airportIdent, current);
    }
    return byAirport;
  };

  return {
    async getRunwaysByAirportIdent(ident: unknown) {
      const byAirport = await readByAirportIdents([ident]);
      return byAirport.get(normalizeIdent(ident)) || [];
    },
    readByAirportIdents,
  };
}

export function createRunwayGeometryRepositoryFromEnv({
  env = process.env,
  createClientImpl,
}: {
  env?: Record<string, string | undefined>;
  createClientImpl?: any;
} = {}) {
  return createRunwayGeometryRepository({
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL,
    supabaseKey:
      env.SUPABASE_SECRET_KEY ||
      env.SUPABASE_SERVICE_ROLE_KEY ||
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      env.SUPABASE_PUBLISHABLE_KEY,
    createClientImpl,
  });
}
