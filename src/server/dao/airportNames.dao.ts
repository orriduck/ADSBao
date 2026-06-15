import {
  createPostgresQueryClientFromEnv,
  type PostgresQueryClient,
} from "./postgresClient";

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
  queryClient,
}: {
  queryClient?: PostgresQueryClient | null;
} = {}) {
  if (!queryClient) return null;

  // Returns a Map keyed by every identifier a caller might hold (ICAO code and
  // OurAirports `ident`, which usually coincide) so a lookup by the OpenAIP
  // ICAO resolves regardless of which column carried the match.
  const readNamesByIdents = async (idents: unknown[] = []) => {
    const normalizedIdents = [...new Set(idents.map(normalizeIdent).filter(Boolean))];
    const byIdent = new Map<string, { name: string; city: string }>();
    if (normalizedIdents.length === 0) return byIdent;

    let rows: AirportNameRecord[] = [];
    try {
      const result = await queryClient.query<AirportNameRecord>(
        `
          select ${SELECT_COLUMNS}
          from ${AIRPORTS_TABLE}
          where (icao_code = any($1::text[]) or ident = any($1::text[]))
        `,
        [normalizedIdents],
      );
      rows = result.rows || [];
    } catch (error: any) {
      throw new Error(`Airport name read failed (${error.message})`);
    }

    for (const row of rows) {
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
  queryClient,
  createPoolImpl,
}: {
  env?: Record<string, string | undefined>;
  queryClient?: PostgresQueryClient | null;
  createPoolImpl?: any;
} = {}) {
  return createAirportNameRepository({
    queryClient:
      queryClient === undefined
        ? createPostgresQueryClientFromEnv({ env, createPoolImpl })
        : queryClient,
  });
}
