import { toFiniteNumber } from "../../../utils/math.js";
import { createServerSupabaseClient } from "./supabaseClient.js";

const AIRPORT_COLUMNS =
  "ident,type,name,latitude_deg,longitude_deg,elevation_ft,continent,iso_country,iso_region,municipality,scheduled_service,icao_code,iata_code,gps_code,local_code,home_link,wikipedia_link,keywords";

const RUNWAY_COLUMNS =
  "id,airport_ident,length_ft,width_ft,surface,lighted,closed,le_ident,le_latitude_deg,le_longitude_deg,le_elevation_ft,le_heading_deg_t,le_displaced_threshold_ft,he_ident,he_latitude_deg,he_longitude_deg,he_elevation_ft,he_heading_deg_t,he_displaced_threshold_ft";

const FREQUENCY_COLUMNS =
  "id,airport_ident,type,description,frequency_mhz";

const NAVAID_COLUMNS =
  "id,ident,name,type,frequency_khz,latitude_deg,longitude_deg,elevation_ft,iso_country,dme_frequency_khz,dme_channel,slaved_variation_deg,magnetic_variation_deg,usage_type,power,associated_airport";

const TYPE_RANK = {
  large_airport: 0,
  medium_airport: 1,
  small_airport: 2,
  seaplane_base: 3,
  balloonport: 4,
  heliport: 5,
  closed: 9,
};

const EARTH_RADIUS_NM = 3440.065;

const US_CLASS_C_AIRPORTS = new Set([
  "KABE", "KABI", "KABQ", "KACY", "KALB", "KAMA", "KAUS", "KAVL", "KBAB",
  "KBAD", "KBDL", "KBGR", "KBHM", "KBIL", "KBNA", "KBOI", "KBTR", "KBTV",
  "KBUF", "KBUR", "KCAE", "KCAK", "KCBM", "KCHA", "KCHS", "KCID", "KCMH",
  "KCMI", "KCOS", "KCRP", "KCRW", "KDAB", "KDAY", "KDLF", "KDMA", "KDSM",
  "KDYS", "KELP", "KEVV", "KFAT", "KFAY", "KFLL", "KFNT", "KFWA", "KGEG",
  "KGRB", "KGRR", "KGSO", "KGSP", "KHRL", "KHSV", "KICT", "KIND", "KISP",
  "KJAN", "KJAX", "KLAN", "KLBB", "KLEX", "KLFT", "KLIT", "KLNK", "KMAF",
  "KMDT", "KMDW", "KMHT", "KMKE", "KMLI", "KMOB", "KMRY", "KMSN", "KMYR",
  "KNDZ", "KNPA", "KNSE", "KNUW", "KOAK", "KOFF", "KOKC", "KOMA", "KONT",
  "KORF", "KPBI", "KPDX", "KPIA", "KPNS", "KPOB", "KPVD", "KPWM", "KRDU",
  "KRIC", "KRIV", "KRNO", "KROA", "KROC", "KRSW", "KSAT", "KSAV", "KSBA",
  "KSBN", "KSDF", "KSFB", "KSGF", "KSHV", "KSJC", "KSKA", "KSMF", "KSNA",
  "KSPI", "KSRQ", "KSSC", "KSYR", "KTIK", "KTLH", "KTOL", "KTUL", "KTUS",
  "KTYS", "KXNA",
]);

const normalizeIdent = (value) =>
  String(value ?? "").trim().toUpperCase();

const escapeIlike = (value) =>
  String(value ?? "").replace(/[%_,]/g, (match) => `\\${match}`);

const haversineNm = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const a =
    sinLat * sinLat +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinLon * sinLon;
  return 2 * EARTH_RADIUS_NM * Math.asin(Math.min(1, Math.sqrt(a)));
};

export const typeRank = (type) => TYPE_RANK[type] ?? 9;

const nearbyAirportRank = (airport) => {
  const rank = typeRank(airport?.type);
  const hasCommercialCode = Boolean(airport?.iata);
  const hasScheduledService = Boolean(airport?.scheduledService);
  const codeRank = hasScheduledService && hasCommercialCode ? -0.2 : hasCommercialCode ? -0.1 : 0;
  return rank + codeRank;
};

const sortNearbyRows = (table, left, right) => {
  if (table === "airports") {
    const leftRank = nearbyAirportRank(left);
    const rightRank = nearbyAirportRank(right);
    if (leftRank !== rightRank) return leftRank - rightRank;
  }
  return left.distanceNm - right.distanceNm;
};

const isNearbyAirportDisplayCandidate = (table, airport) => {
  if (table !== "airports") return true;
  const airportIcao = normalizeIdent(airport?.icao || airport?.ident);
  return (
    airport?.type === "large_airport" ||
    (airport?.type === "medium_airport" && US_CLASS_C_AIRPORTS.has(airportIcao))
  );
};

export const mapAirportRow = (row) => {
  if (!row) return null;
  return {
    ident: row.ident,
    icao: row.icao_code || row.ident,
    iata: row.iata_code || "",
    code: row.icao_code || row.ident,
    name: row.name || row.ident,
    type: row.type || "",
    type_label: row.type
      ? row.type.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase())
      : "",
    city: row.municipality || "",
    country: row.iso_country || "",
    region: row.iso_region || "",
    continent: row.continent || "",
    lat: toFiniteNumber(row.latitude_deg),
    lon: toFiniteNumber(row.longitude_deg),
    elevationFt: toFiniteNumber(row.elevation_ft),
    scheduledService: Boolean(row.scheduled_service),
    gpsCode: row.gps_code || "",
    localCode: row.local_code || "",
    homeLink: row.home_link || "",
    wikipediaLink: row.wikipedia_link || "",
    keywords: row.keywords || "",
    source: "ourairports",
  };
};

export const mapRunwayRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    airportIdent: row.airport_ident,
    lengthFt: toFiniteNumber(row.length_ft),
    widthFt: toFiniteNumber(row.width_ft),
    surface: row.surface || "",
    lighted: Boolean(row.lighted),
    closed: Boolean(row.closed),
    le: {
      ident: row.le_ident || "",
      lat: toFiniteNumber(row.le_latitude_deg),
      lon: toFiniteNumber(row.le_longitude_deg),
      elevationFt: toFiniteNumber(row.le_elevation_ft),
      headingDegT: toFiniteNumber(row.le_heading_deg_t),
      displacedThresholdFt: toFiniteNumber(row.le_displaced_threshold_ft),
    },
    he: {
      ident: row.he_ident || "",
      lat: toFiniteNumber(row.he_latitude_deg),
      lon: toFiniteNumber(row.he_longitude_deg),
      elevationFt: toFiniteNumber(row.he_elevation_ft),
      headingDegT: toFiniteNumber(row.he_heading_deg_t),
      displacedThresholdFt: toFiniteNumber(row.he_displaced_threshold_ft),
    },
  };
};

export const mapFrequencyRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    airportIdent: row.airport_ident,
    type: row.type || "",
    description: row.description || "",
    frequencyMhz: toFiniteNumber(row.frequency_mhz),
  };
};

export const mapNavaidRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    ident: row.ident || "",
    name: row.name || row.ident || "",
    type: row.type || "",
    frequencyKhz: toFiniteNumber(row.frequency_khz),
    lat: toFiniteNumber(row.latitude_deg),
    lon: toFiniteNumber(row.longitude_deg),
    elevationFt: toFiniteNumber(row.elevation_ft),
    country: row.iso_country || "",
    dme: {
      frequencyKhz: toFiniteNumber(row.dme_frequency_khz),
      channel: row.dme_channel || "",
    },
    magneticVariationDeg: toFiniteNumber(row.magnetic_variation_deg),
    slavedVariationDeg: toFiniteNumber(row.slaved_variation_deg),
    usageType: row.usage_type || "",
    power: row.power || "",
    associatedAirport: row.associated_airport || "",
  };
};

const sortBySearchRelevance = (rows, query) => {
  const upper = normalizeIdent(query);
  return [...rows].sort((left, right) => {
    const leftCode = (left.icao_code || left.ident || "").toUpperCase();
    const rightCode = (right.icao_code || right.ident || "").toUpperCase();
    const leftIata = (left.iata_code || "").toUpperCase();
    const rightIata = (right.iata_code || "").toUpperCase();

    const score = (code, iata, type) => {
      if (code === upper || iata === upper) return 0;
      if (code.startsWith(upper) || iata.startsWith(upper)) return 1;
      return 2 + (typeRank(type) || 0);
    };

    const leftScore = score(leftCode, leftIata, left.type);
    const rightScore = score(rightCode, rightIata, right.type);
    if (leftScore !== rightScore) return leftScore - rightScore;

    const leftRank = typeRank(left.type);
    const rightRank = typeRank(right.type);
    if (leftRank !== rightRank) return leftRank - rightRank;

    return String(left.name || "").localeCompare(String(right.name || ""));
  });
};

const requireClient = (client) => {
  if (!client) {
    throw new Error("OurAirports query layer is not configured (no Supabase client)");
  }
  return client;
};

export const createOurAirportsQueryClient = ({
  supabaseUrl,
  supabaseKey,
  createClientImpl,
} = {}) => {
  return createServerSupabaseClient({
    supabaseUrl,
    supabaseKey,
    createClientImpl,
  });
};

export const createOurAirportsQueries = ({ client } = {}) => {
  const select = (table, columns) => requireClient(client).from(table).select(columns);

  return {
    async searchAirports({ query = "", country = "", type = "", limit = 25 } = {}) {
      const trimmed = String(query || "").trim();
      const normalizedCountry = String(country || "").trim().toUpperCase();
      const normalizedType = String(type || "").trim();
      const safeLimit = Math.max(1, Math.min(Number(limit) || 25, 200));

      const applyCommonFilters = (request) => {
        let next = request;
        if (normalizedCountry) next = next.eq("iso_country", normalizedCountry);
        if (normalizedType && normalizedType !== "all") {
          next = next.eq("type", normalizedType);
        }
        return next;
      };

      if (!trimmed) {
        const { data, error } = await applyCommonFilters(
          select("airports", AIRPORT_COLUMNS),
        ).limit(safeLimit);
        if (error) throw new Error(`searchAirports failed: ${error.message}`);
        return (data || []).map(mapAirportRow).filter(Boolean);
      }

      // Postgres returns rows in undefined order for an unsorted SELECT, so
      // applying LIMIT to a fat OR query can starve high-value exact-code
      // matches when the substring fan-out has hundreds of hits. Split the
      // query into three buckets (exact code, prefix, substring), run them
      // in parallel, then dedupe + rank client-side.
      const upper = trimmed.toUpperCase();
      const ilike = `%${escapeIlike(trimmed)}%`;
      const prefixIlike = `${escapeIlike(upper)}%`;

      const exactFilter = [
        `ident.eq.${upper}`,
        `icao_code.eq.${upper}`,
        `iata_code.eq.${upper}`,
      ].join(",");
      const prefixFilter = [
        `icao_code.ilike.${prefixIlike}`,
        `iata_code.ilike.${prefixIlike}`,
        `ident.ilike.${prefixIlike}`,
      ].join(",");
      const substringFilter = [
        `name.ilike.${ilike}`,
        `municipality.ilike.${ilike}`,
        `keywords.ilike.${ilike}`,
      ].join(",");

      // For substring matches we order server-side by scheduled_service first
      // (commercial airports beat rural strips of the same name) so the LIMIT
      // doesn't starve KBOS-class results when there are hundreds of matches.
      const [exactResult, prefixResult, substringResult] = await Promise.all([
        applyCommonFilters(select("airports", AIRPORT_COLUMNS))
          .or(exactFilter)
          .limit(safeLimit),
        applyCommonFilters(select("airports", AIRPORT_COLUMNS))
          .or(prefixFilter)
          .order("scheduled_service", { ascending: false })
          .limit(safeLimit),
        applyCommonFilters(select("airports", AIRPORT_COLUMNS))
          .or(substringFilter)
          .order("scheduled_service", { ascending: false })
          .order("name", { ascending: true })
          .limit(safeLimit * 4),
      ]);

      for (const result of [exactResult, prefixResult, substringResult]) {
        if (result.error) {
          throw new Error(`searchAirports failed: ${result.error.message}`);
        }
      }

      const seen = new Set();
      const merged = [];
      for (const row of [
        ...(exactResult.data || []),
        ...(prefixResult.data || []),
        ...(substringResult.data || []),
      ]) {
        if (!row?.ident || seen.has(row.ident)) continue;
        seen.add(row.ident);
        merged.push(row);
      }

      const ranked = sortBySearchRelevance(merged, trimmed).slice(0, safeLimit);
      return ranked.map(mapAirportRow).filter(Boolean);
    },

    async getAirportByIdent(ident) {
      const normalized = normalizeIdent(ident);
      if (!normalized) return null;

      const { data, error } = await requireClient(client)
        .from("airports")
        .select(AIRPORT_COLUMNS)
        .or(`ident.eq.${normalized},icao_code.eq.${normalized},iata_code.eq.${normalized}`)
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw new Error(`getAirportByIdent failed: ${error.message}`);
      }

      return mapAirportRow(data);
    },

    async getRunwaysByAirport(ident) {
      const normalized = normalizeIdent(ident);
      if (!normalized) return [];

      const { data, error } = await select("runways", RUNWAY_COLUMNS)
        .eq("airport_ident", normalized)
        .order("le_ident", { ascending: true });

      if (error) {
        throw new Error(`getRunwaysByAirport failed: ${error.message}`);
      }
      return (data || []).map(mapRunwayRow).filter(Boolean);
    },

    async getFrequenciesByAirport(ident) {
      const normalized = normalizeIdent(ident);
      if (!normalized) return [];

      const { data, error } = await select("airport_frequencies", FREQUENCY_COLUMNS)
        .eq("airport_ident", normalized)
        .order("type", { ascending: true })
        .order("frequency_mhz", { ascending: true });

      if (error) {
        throw new Error(`getFrequenciesByAirport failed: ${error.message}`);
      }
      return (data || []).map(mapFrequencyRow).filter(Boolean);
    },

    async getNearbyAirports({ ident, radiusNm = 60, limit = 12 } = {}) {
      const origin = await this.getAirportByIdent(ident);
      if (!origin || !Number.isFinite(origin.lat) || !Number.isFinite(origin.lon)) {
        return [];
      }
      return queryNearby({
        client,
        table: "airports",
        columns: AIRPORT_COLUMNS,
        origin,
        radiusNm,
        limit,
        excludeIdent: origin.ident,
        rowMapper: mapAirportRow,
      });
    },

    async getNearbyAirportsByPosition({
      lat,
      lon,
      radiusNm = 60,
      limit = 12,
      excludeIdent = "",
    } = {}) {
      const originLat = toFiniteNumber(lat);
      const originLon = toFiniteNumber(lon);
      if (!Number.isFinite(originLat) || !Number.isFinite(originLon)) {
        return [];
      }
      return queryNearby({
        client,
        table: "airports",
        columns: AIRPORT_COLUMNS,
        origin: {
          ident: normalizeIdent(excludeIdent),
          lat: originLat,
          lon: originLon,
        },
        radiusNm,
        limit,
        excludeIdent: normalizeIdent(excludeIdent),
        rowMapper: mapAirportRow,
      });
    },

    async getNearbyNavaids({ ident, radiusNm = 60, limit = 12 } = {}) {
      const origin = await this.getAirportByIdent(ident);
      if (!origin || !Number.isFinite(origin.lat) || !Number.isFinite(origin.lon)) {
        return [];
      }
      return queryNearby({
        client,
        table: "navaids",
        columns: NAVAID_COLUMNS,
        origin,
        radiusNm,
        limit,
        rowMapper: mapNavaidRow,
      });
    },
  };
};

const queryNearby = async ({
  client,
  table,
  columns,
  origin,
  radiusNm,
  limit,
  excludeIdent,
  rowMapper,
}) => {
  const radius = Math.max(1, Math.min(Number(radiusNm) || 60, 500));
  const safeLimit = Math.max(1, Math.min(Number(limit) || 12, 100));

  const latDelta = radius / 60;
  const cosLat = Math.max(Math.cos((origin.lat * Math.PI) / 180), 0.0001);
  const lonDelta = radius / (60 * cosLat);

  const minLat = origin.lat - latDelta;
  const maxLat = origin.lat + latDelta;
  const minLon = origin.lon - lonDelta;
  const maxLon = origin.lon + lonDelta;

  let request = requireClient(client)
    .from(table)
    .select(columns)
    .gte("latitude_deg", minLat)
    .lte("latitude_deg", maxLat);

  if (minLon < -180 || maxLon > 180) {
    request = request.or(
      `longitude_deg.gte.${minLon < -180 ? minLon + 360 : minLon},longitude_deg.lte.${maxLon > 180 ? maxLon - 360 : maxLon}`,
    );
  } else {
    request = request.gte("longitude_deg", minLon).lte("longitude_deg", maxLon);
  }

  request = request.limit(table === "airports" ? safeLimit * 12 : safeLimit * 4);

  const { data, error } = await request;
  if (error) {
    throw new Error(`nearby query failed on ${table}: ${error.message}`);
  }

  return (data || [])
    .filter((row) => row.ident !== excludeIdent)
    .map((row) => {
      const lat = toFiniteNumber(row.latitude_deg);
      const lon = toFiniteNumber(row.longitude_deg);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      const distanceNm = haversineNm(origin.lat, origin.lon, lat, lon);
      const mapped = rowMapper(row);
      if (!mapped) return null;
      return { ...mapped, distanceNm };
    })
    .filter(
      (row) =>
        row &&
        row.distanceNm <= radius &&
        isNearbyAirportDisplayCandidate(table, row),
    )
    .sort((left, right) => sortNearbyRows(table, left, right))
    .slice(0, safeLimit);
};

export const createOurAirportsQueriesFromEnv = ({
  env = process.env,
  createClientImpl,
} = {}) => {
  const client = createOurAirportsQueryClient({
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL,
    supabaseKey:
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      env.SUPABASE_PUBLISHABLE_KEY ||
      env.SUPABASE_SECRET_KEY ||
      env.SUPABASE_SERVICE_ROLE_KEY,
    createClientImpl,
  });
  if (!client) return null;
  return createOurAirportsQueries({ client });
};
