import { toFiniteNumber } from "../../../utils/math";
import {
  isNormalOpenAipAirportCode,
  mapOpenAipAirport,
  mapOpenAipAirspace,
  mapOpenAipFrequency,
  mapOpenAipNavaid,
  mapOpenAipObstacle,
  mapOpenAipReportingPoint,
  mapOpenAipRunway,
  openAipAirportCode,
  rankOpenAipAirports,
} from "./openAipNormalizer";
import { createOpenAipClientFromEnv } from "./openAipClient";
import { AirportDirectoryConfigurationError } from "../directory/airportDirectory.models";
import { createRunwayGeometryRepositoryFromEnv } from "../../../app/api/dao/runwayGeometries.dao";
import { buildRunwayMapFromGeometries } from "../runways/runwayGeometryMap";

type OpenAipDirectoryRecord = Record<string, any>;

const METERS_PER_NM = 1852;
const EARTH_RADIUS_NM = 3440.065;

const AIRPORT_LIST_FIELDS = [
  "_id",
  "name",
  "icaoCode",
  "iataCode",
  "altIdentifier",
  "type",
  "country",
  "geometry",
  "elevation",
  "runways",
  "frequencies",
  "updatedAt",
];

const AIRPORT_DETAIL_FIELDS = [
  ...AIRPORT_LIST_FIELDS,
  "trafficType",
  "magneticDeclination",
  "ppr",
  "private",
  "skydiveActivity",
  "winchOnly",
  "services",
  "remarks",
  "contact",
];

const NAVAID_FIELDS = [
  "_id",
  "name",
  "identifier",
  "type",
  "country",
  "channel",
  "frequency",
  "geometry",
  "elevation",
  "magneticDeclination",
];

const AIRSPACE_FIELDS = [
  "_id",
  "name",
  "type",
  "icaoClass",
  "country",
  "geometry",
  "lowerLimit",
  "upperLimit",
  "activeFrom",
  "activeUntil",
];

const REPORTING_POINT_FIELDS = [
  "_id",
  "name",
  "country",
  "geometry",
  "compulsory",
  "remarks",
];

const OBSTACLE_FIELDS = [
  "_id",
  "name",
  "type",
  "country",
  "geometry",
  "elevation",
  "height",
];

const NEARBY_AIRPORT_TYPES = "0,2,3,9,10,11,13";

const normalizeCode = (value: unknown) => String(value ?? "").trim().toUpperCase();

const getClient = (client: OpenAipDirectoryRecord | null | undefined) => {
  if (client) return client;
  const fromEnv = createOpenAipClientFromEnv();
  if (!fromEnv) {
    throw new AirportDirectoryConfigurationError("OpenAIP API key is not configured");
  }
  return fromEnv;
};

const listItems = async (
  promise: Promise<OpenAipDirectoryRecord>,
): Promise<OpenAipDirectoryRecord[]> => {
  const payload = await promise;
  return Array.isArray(payload?.items) ? payload.items : [];
};

const airportDistanceNm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const a =
    sinLat * sinLat +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinLon * sinLon;
  return 2 * EARTH_RADIUS_NM * Math.asin(Math.min(1, Math.sqrt(a)));
};

const withDistance = (
  airport: OpenAipDirectoryRecord | null,
  origin: OpenAipDirectoryRecord,
) => {
  if (
    !airport ||
    !Number.isFinite(airport.lat) ||
    !Number.isFinite(airport.lon) ||
    !Number.isFinite(origin.lat) ||
    !Number.isFinite(origin.lon)
  ) {
    return null;
  }
  return {
    ...airport,
    distanceNm: airportDistanceNm(origin.lat, origin.lon, airport.lat, airport.lon),
  };
};

const uniqueByAirportCode = (airports: OpenAipDirectoryRecord[]) => {
  const seen = new Set<string>();
  const unique: OpenAipDirectoryRecord[] = [];
  for (const airport of airports) {
    const key = airport?._id || airport?.icaoCode || airport?.iataCode || airport?.name;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(airport);
  }
  return unique;
};

const hasNormalOpenAipAirportCode = (airport: OpenAipDirectoryRecord) =>
  isNormalOpenAipAirportCode(openAipAirportCode(airport));

const getRunwayGeometryRepository = (
  repository: OpenAipDirectoryRecord | null | undefined,
) => {
  if (repository !== undefined) return repository;
  return createRunwayGeometryRepositoryFromEnv();
};

const readRunwayGeometryMaps = async ({
  repository,
  airports = [],
}: OpenAipDirectoryRecord = {}) => {
  if (!repository?.readByAirportIdents) return new Map();
  const idents = [...new Set(
    airports
      .map((airport: OpenAipDirectoryRecord) => normalizeCode(airport?.icao || airport?.ident))
      .filter(Boolean),
  )];
  if (idents.length === 0) return new Map();

  let byAirport;
  try {
    byAirport = await repository.readByAirportIdents(idents);
  } catch (error: any) {
    console.warn("[openaip] runway geometry read failed:", error?.message || error);
    return new Map();
  }

  const maps = new Map();
  for (const ident of idents) {
    maps.set(
      ident,
      buildRunwayMapFromGeometries({
        airport: ident,
        runways: byAirport.get(ident) || [],
        source: "OurAirports",
      }),
    );
  }
  return maps;
};

export async function searchOpenAipAirportDocuments({
  query = "",
  country = "",
  limit = 12,
  client,
}: OpenAipDirectoryRecord = {}) {
  const openAip = getClient(client);
  const safeLimit = Math.max(1, Math.min(Number(limit) || 12, 50));
  const search = String(query || "").trim();
  const normalizedCountry = normalizeCode(country);
  const requestLimit = search ? 50 : safeLimit;

  const items = await listItems(
    openAip.listAirports({
      search,
      country: normalizedCountry,
      limit: requestLimit,
      fields: AIRPORT_LIST_FIELDS,
    }),
  );

  return rankOpenAipAirports(
    uniqueByAirportCode(items).filter(hasNormalOpenAipAirportCode),
    search,
  ).slice(0, safeLimit);
}

export async function searchOpenAipAirports(options: OpenAipDirectoryRecord = {}) {
  const documents = await searchOpenAipAirportDocuments(options);
  return documents.map(mapOpenAipAirport).filter(Boolean);
}

export async function findOpenAipAirportByIdent({
  ident,
  client,
}: OpenAipDirectoryRecord = {}) {
  const normalized = normalizeCode(ident);
  if (!normalized) return null;
  const matches = await searchOpenAipAirportDocuments({
    query: normalized,
    limit: 50,
    client,
  });
  return rankOpenAipAirports(matches, normalized)[0] || null;
}

export const createOpenAipAirportQueriesFromEnv = () => ({
  async getAirportByIdent(ident: unknown) {
    const document = await findOpenAipAirportByIdent({ ident });
    return mapOpenAipAirport(document);
  },
});

export async function getOpenAipAirportPage({
  ident,
  radiusNm = 60,
  nearbyLimit = 12,
  client,
  runwayGeometryRepository,
}: OpenAipDirectoryRecord = {}) {
  const openAip = getClient(client);
  const runwayRepository = getRunwayGeometryRepository(runwayGeometryRepository);
  const airportMatch = await findOpenAipAirportByIdent({ ident, client: openAip });
  if (!airportMatch?._id) {
    return {
      airport: null,
      runways: [],
      frequencies: [],
      nearbyAirports: [],
      nearbyNavaids: [],
      airspaces: [],
      reportingPoints: [],
      obstacles: [],
      runwayMap: null,
    };
  }

  const airportDocument = await openAip.getAirport(airportMatch._id, {
    fields: AIRPORT_DETAIL_FIELDS,
  });
  const airport = mapOpenAipAirport(airportDocument);
  if (!airport) return null;

  const radiusMeters = Math.round(Math.max(1, Math.min(Number(radiusNm) || 60, 250)) * METERS_PER_NM);
  const limit = Math.max(1, Math.min(Number(nearbyLimit) || 12, 50));
  const nearbyAirportRequestLimit = Math.min(100, limit * 5 + 1);
  const pos =
    Number.isFinite(airport.lat) && Number.isFinite(airport.lon)
      ? `${airport.lat},${airport.lon}`
      : "";

  const [
    nearbyAirportDocuments,
    nearbyNavaidDocuments,
    airspaceDocuments,
    reportingPointDocuments,
    obstacleDocuments,
  ] = pos
    ? await Promise.all([
        listItems(
          openAip.listAirports({
            pos,
            dist: radiusMeters,
            type: NEARBY_AIRPORT_TYPES,
            limit: nearbyAirportRequestLimit,
            fields: AIRPORT_LIST_FIELDS,
          }),
        ),
        listItems(
          openAip.listNavaids({
            pos,
            dist: radiusMeters,
            limit,
            fields: NAVAID_FIELDS.join(","),
          }),
        ),
        listItems(
          openAip.listAirspaces({
            pos,
            dist: radiusMeters,
            limit: 100,
            fields: AIRSPACE_FIELDS.join(","),
          }),
        ),
        listItems(
          openAip.listReportingPoints({
            airport: airportDocument._id,
            limit: 100,
            fields: REPORTING_POINT_FIELDS.join(","),
          }),
        ),
        listItems(
          openAip.listObstacles({
            pos,
            dist: Math.min(radiusMeters, 50 * METERS_PER_NM),
            limit: 100,
            fields: OBSTACLE_FIELDS.join(","),
          }),
        ),
      ])
    : [[], [], [], [], []];

  const origin = { lat: airport.lat, lon: airport.lon };
  const nearbyAirportsBase = nearbyAirportDocuments
    .map(mapOpenAipAirport)
    .filter((item: OpenAipDirectoryRecord | null) => item?.icao && item.icao !== airport.icao)
    .map((item: OpenAipDirectoryRecord | null) => withDistance(item, origin))
    .filter(Boolean)
    .sort((left: OpenAipDirectoryRecord, right: OpenAipDirectoryRecord) => left.distanceNm - right.distanceNm)
    .slice(0, limit);
  const runwayMaps = await readRunwayGeometryMaps({
    repository: runwayRepository,
    airports: [airport, ...nearbyAirportsBase],
  });
  const nearbyAirports = nearbyAirportsBase.map((item: OpenAipDirectoryRecord) => ({
    ...item,
    runwayMap: runwayMaps.get(item.icao) || null,
  }));

  return {
    airport,
    runways: (airportDocument.runways || [])
      .map((runway: OpenAipDirectoryRecord) => mapOpenAipRunway(runway, airportDocument))
      .filter(Boolean),
    frequencies: (airportDocument.frequencies || [])
      .map((frequency: OpenAipDirectoryRecord) => mapOpenAipFrequency(frequency, airportDocument))
      .filter(Boolean),
    nearbyAirports,
    nearbyNavaids: nearbyNavaidDocuments.map(mapOpenAipNavaid).filter(Boolean),
    airspaces: airspaceDocuments.map(mapOpenAipAirspace).filter(Boolean),
    reportingPoints: reportingPointDocuments
      .map(mapOpenAipReportingPoint)
      .filter(Boolean),
    obstacles: obstacleDocuments.map(mapOpenAipObstacle).filter(Boolean),
    runwayMap: runwayMaps.get(airport.icao) || null,
  };
}

export async function getOpenAipNearbyAirports({
  query,
  client,
  runwayGeometryRepository,
}: OpenAipDirectoryRecord = {}) {
  const openAip = getClient(client);
  const runwayRepository = getRunwayGeometryRepository(runwayGeometryRepository);
  const lat = toFiniteNumber(query?.lat);
  const lon = toFiniteNumber(query?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return {
      airports: [],
      source: "openaip",
      radiusNm: query?.radiusNm,
      limit: query?.limit,
    };
  }
  const limit = Math.max(1, Math.min(Number(query?.limit) || 12, 100));
  const radiusNm = Math.max(1, Math.min(Number(query?.radiusNm) || 60, 250));
  const requestLimit = Math.min(100, limit * 5 + 1);
  const documents = await listItems(
    openAip.listAirports({
      pos: `${lat},${lon}`,
      dist: Math.round(radiusNm * METERS_PER_NM),
      type: NEARBY_AIRPORT_TYPES,
      limit: requestLimit,
      fields: AIRPORT_LIST_FIELDS,
    }),
  );
  const origin = { lat, lon };
  const normalizedIcao = normalizeCode(query?.icao);
  const airportsBase = documents
    .map(mapOpenAipAirport)
    .filter((airport: OpenAipDirectoryRecord | null) => airport?.icao && airport.icao !== normalizedIcao)
    .map((airport: OpenAipDirectoryRecord | null) => withDistance(airport, origin))
    .filter(Boolean)
    .sort((left: OpenAipDirectoryRecord, right: OpenAipDirectoryRecord) => left.distanceNm - right.distanceNm)
    .slice(0, limit);
  const runwayMaps = await readRunwayGeometryMaps({
    repository: runwayRepository,
    airports: airportsBase,
  });
  const airports = airportsBase.map((airport: OpenAipDirectoryRecord) => ({
    ...airport,
    runwayMap: runwayMaps.get(airport.icao) || null,
  }));

  return {
    airports,
    source: "openaip",
    radiusNm,
    limit,
  };
}
