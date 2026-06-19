import {
  createPostgresQueryClientFromEnv,
  type PostgresQueryClient,
} from "./postgresClient";

type AirportFacilityRecord = Record<string, any>;

const AIRPORT_FREQUENCIES_TABLE = "ourairports.airport_frequencies";
const NAVAIDS_TABLE = "ourairports.navaids";
const AIRPORTS_TABLE = "aviation.airports";
const AIRPORT_ALIASES_TABLE = "aviation.airport_aliases";

const AIRPORT_FREQUENCY_COLUMN_NAMES = [
  "id",
  "airport_ref",
  "airport_ident",
  "type",
  "description",
  "frequency_mhz",
];

const AIRPORT_FREQUENCY_COLUMNS = AIRPORT_FREQUENCY_COLUMN_NAMES.map(
  (column) => `airport_frequencies.${column}`,
).join(",");

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

function createAirportFacilityRepository({
  queryClient,
}: {
  queryClient?: PostgresQueryClient | null;
} = {}) {
  if (!queryClient) return null;

  return {
    async readFrequenciesByAirportIdent(ident: unknown) {
      const airportIdent = normalizeIdent(ident);
      if (!airportIdent) return [];

      let rows: AirportFacilityRecord[] = [];
      try {
        const result = await queryClient.query<AirportFacilityRecord>(
          `
            select ${AIRPORT_FREQUENCY_COLUMNS}
            from ${AIRPORT_ALIASES_TABLE} aliases
            join ${AIRPORTS_TABLE} airports
              on airports.ident = aliases.airport_ident
            join ${AIRPORT_FREQUENCIES_TABLE} airport_frequencies
              on airport_frequencies.airport_ident = airports.ourairports_ident
            where aliases.alias_ident = $1
            order by airport_frequencies.type asc, airport_frequencies.frequency_mhz asc
          `,
          [airportIdent],
        );
        rows = result.rows || [];
      } catch (error: any) {
        throw new Error(`Airport frequencies read failed (${error.message})`);
      }

      return rows.map(mapFrequencyRow).filter(Boolean);
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

      let rows: AirportFacilityRecord[] = [];
      try {
        const result = await queryClient.query<AirportFacilityRecord>(
          `
            select ${NAVAID_COLUMNS}
            from ${NAVAIDS_TABLE}
            where latitude_deg >= $1
              and latitude_deg <= $2
              and longitude_deg >= $3
              and longitude_deg <= $4
            order by ident asc
            limit $5
          `,
          [bounds.south, bounds.north, bounds.west, bounds.east, safeLimit],
        );
        rows = result.rows || [];
      } catch (error: any) {
        throw new Error(`Navaids read failed (${error.message})`);
      }

      return rows.map(mapNavaidRow).filter(Boolean);
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

      let rows: AirportFacilityRecord[] = [];
      try {
        const result = await queryClient.query<AirportFacilityRecord>(
          `
            select ${NAVAID_COLUMNS}
            from ${NAVAIDS_TABLE}
            where latitude_deg >= $1
              and latitude_deg <= $2
              and longitude_deg >= $3
              and longitude_deg <= $4
            order by ident asc
            limit $5
          `,
          [
            Math.min(south, north),
            Math.max(south, north),
            Math.min(west, east),
            Math.max(west, east),
            safeLimit,
          ],
        );
        rows = result.rows || [];
      } catch (error: any) {
        throw new Error(`Navaid tile read failed (${error.message})`);
      }

      return rows.map(mapNavaidRow).filter(Boolean);
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

      let count = 0;
      try {
        const result = await queryClient.query<{ count: number | string }>(
          `
            select count(*)::int as count
            from ${NAVAIDS_TABLE}
            where latitude_deg >= $1
              and latitude_deg <= $2
              and longitude_deg >= $3
              and longitude_deg <= $4
          `,
          [
            Math.min(south, north),
            Math.max(south, north),
            Math.min(west, east),
            Math.max(west, east),
          ],
        );
        count = Number(result.rows?.[0]?.count) || 0;
      } catch (error: any) {
        throw new Error(`Navaid count tile read failed (${error.message})`);
      }

      return Math.max(0, Number(count) || 0);
    },
  };
}

export function createAirportFacilityRepositoryFromEnv({
  env = process.env,
  queryClient,
  createPoolImpl,
}: {
  env?: Record<string, string | undefined>;
  queryClient?: PostgresQueryClient | null;
  createPoolImpl?: any;
} = {}) {
  return createAirportFacilityRepository({
    queryClient:
      queryClient === undefined
        ? createPostgresQueryClientFromEnv({ env, createPoolImpl })
        : queryClient,
  });
}
