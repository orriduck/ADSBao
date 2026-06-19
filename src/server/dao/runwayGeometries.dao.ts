import {
  createPostgresQueryClientFromEnv,
  type PostgresQueryClient,
} from "./postgresClient";

type RunwayGeometryRecord = Record<string, any>;

const RUNWAY_GEOMETRIES_TABLE = "ourairports.runway_geometries";

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
  queryClient,
}: {
  queryClient?: PostgresQueryClient | null;
} = {}) {
  if (!queryClient) return null;

  const readByAirportIdents = async (idents: unknown[] = []) => {
    const normalizedIdents = [...new Set(idents.map(normalizeIdent).filter(Boolean))];
    if (normalizedIdents.length === 0) return new Map();

    let rows: RunwayGeometryRecord[] = [];
    try {
      const result = await queryClient.query<RunwayGeometryRecord>(
        `
          select ${SELECT_COLUMNS}
          from ${RUNWAY_GEOMETRIES_TABLE}
          where source = $1
            and airport_ident = any($2::text[])
          order by airport_ident asc, le_ident asc
        `,
        ["ourairports", normalizedIdents],
      );
      rows = result.rows || [];
    } catch (error: any) {
      throw new Error(`Runway geometry read failed (${error.message})`);
    }

    const byAirport = new Map();
    for (const row of rows) {
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
  queryClient,
  createPoolImpl,
}: {
  env?: Record<string, string | undefined>;
  queryClient?: PostgresQueryClient | null;
  createPoolImpl?: any;
} = {}) {
  return createRunwayGeometryRepository({
    queryClient:
      queryClient === undefined
        ? createPostgresQueryClientFromEnv({ env, createPoolImpl })
        : queryClient,
  });
}
