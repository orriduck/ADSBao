import {
  createPostgresQueryClientFromEnv,
  type PostgresQueryClient,
} from "./postgresClient";

type AirportNameRecord = Record<string, any>;

// Canonical airport identity cache. Source tables keep upstream keys, while
// reads resolve the identifier a caller has through aviation.airport_aliases.
const AIRPORTS_TABLE = "aviation.airports";
const AIRPORT_ALIASES_TABLE = "aviation.airport_aliases";

const SELECT_COLUMNS = [
  "returned_aliases.alias_ident",
  "airports.ident",
  "airports.icao_code",
  "airports.iata_code",
  "airports.name",
  "airports.municipality",
].join(",");

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
    alias: normalizeIdent(row.alias_ident),
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
          from ${AIRPORT_ALIASES_TABLE} requested_aliases
          join ${AIRPORTS_TABLE} airports
            on airports.ident = requested_aliases.airport_ident
          join ${AIRPORT_ALIASES_TABLE} returned_aliases
            on returned_aliases.airport_ident = airports.ident
          where requested_aliases.alias_ident = any($1::text[])
            and airports.name <> ''
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
      if (mapped.alias) byIdent.set(mapped.alias, value);
      if (mapped.icao) byIdent.set(mapped.icao, value);
      // `ident` only fills a slot the ICAO code didn't already claim, so an
      // exact ICAO match always wins over an ident-only collision.
      if (mapped.ident && !byIdent.has(mapped.ident)) byIdent.set(mapped.ident, value);
      if (mapped.iata && !byIdent.has(mapped.iata)) byIdent.set(mapped.iata, value);
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
