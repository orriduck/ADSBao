import { createServerSupabaseClient } from "./supabaseClient";

type AirportNameRecord = Record<string, any>;

// OurAirports static reference table, restored to provide the full, mixed-case
// airport name that OpenAIP truncates. Keyed by identifier; we read names only.
const AIRPORTS_TABLE = "airports";

const SELECT_COLUMNS = ["ident", "icao_code", "iata_code", "name", "municipality"].join(",");

const normalizeIdent = (value: unknown) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const mapAirportNameRow = (row: AirportNameRecord | null | undefined) => {
  if (!row) return null;
  const name = String(row.name || "").trim();
  if (!name) return null;
  return {
    ident: normalizeIdent(row.ident),
    icao: normalizeIdent(row.icao_code),
    iata: normalizeIdent(row.iata_code),
    name,
    city: String(row.municipality || "").trim(),
  };
};

function createAirportNameRepository({
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

  // Returns a Map keyed by every identifier a caller might hold (ICAO code and
  // OurAirports `ident`, which usually coincide) so a lookup by the OpenAIP
  // ICAO resolves regardless of which column carried the match.
  const readNamesByIdents = async (idents: unknown[] = []) => {
    const normalizedIdents = [...new Set(idents.map(normalizeIdent).filter(Boolean))];
    const byIdent = new Map<string, { name: string; city: string }>();
    if (normalizedIdents.length === 0) return byIdent;

    const list = normalizedIdents.join(",");
    const { data, error } = await client
      .from(AIRPORTS_TABLE)
      .select(SELECT_COLUMNS)
      .or(`icao_code.in.(${list}),ident.in.(${list})`);

    if (error) {
      throw new Error(`Airport name read failed (${error.message})`);
    }

    for (const row of data || []) {
      const mapped = mapAirportNameRow(row);
      if (!mapped) continue;
      const value = { name: mapped.name, city: mapped.city };
      if (mapped.icao) byIdent.set(mapped.icao, value);
      // `ident` only fills a slot the ICAO code didn't already claim, so an
      // exact ICAO match always wins over an ident-only collision.
      if (mapped.ident && !byIdent.has(mapped.ident)) byIdent.set(mapped.ident, value);
    }
    return byIdent;
  };

  return {
    async getNameByIdent(ident: unknown) {
      const byIdent = await readNamesByIdents([ident]);
      return byIdent.get(normalizeIdent(ident)) || null;
    },
    readNamesByIdents,
  };
}

export function createAirportNameRepositoryFromEnv({
  env = process.env,
  createClientImpl,
}: {
  env?: Record<string, string | undefined>;
  createClientImpl?: any;
} = {}) {
  return createAirportNameRepository({
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL,
    supabaseKey:
      env.SUPABASE_SECRET_KEY ||
      env.SUPABASE_SERVICE_ROLE_KEY ||
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      env.SUPABASE_PUBLISHABLE_KEY,
    createClientImpl,
  });
}
