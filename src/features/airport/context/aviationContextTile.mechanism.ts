import { createAirspaceContextRepositoryFromEnv } from "@/app/api/dao/airspaceContext.dao";
import { createAirportFacilityRepositoryFromEnv } from "@/app/api/dao/airportFacilities.dao";
import { AirportDirectoryConfigurationError } from "../directory/airportDirectory.models";
import {
  createOpenAipClientFromEnv,
} from "../openaip/openAipClient";
import {
  mapOpenAipNavaid,
  mapOpenAipReportingPoint,
} from "../openaip/openAipNormalizer";
import {
  buildNavaidCountMarker,
} from "./aviationContextDisplayModel";
import {
  bboxToOpenAipParam,
  buildContextTileCacheKey,
  tileToBbox,
} from "./aviationContextTileModel";

type ContextTileRecord = Record<string, any>;

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
].join(",");

const REPORTING_POINT_FIELDS = [
  "_id",
  "name",
  "country",
  "geometry",
  "compulsory",
  "remarks",
].join(",");

const tileMemoryCache = new Map<string, ContextTileRecord>();

const listItems = async (promise: Promise<ContextTileRecord>) => {
  const payload = await promise;
  return Array.isArray(payload?.items) ? payload.items : [];
};

const getOpenAipClient = (client: ContextTileRecord | null | undefined) => {
  if (client) return client;
  const fromEnv = createOpenAipClientFromEnv();
  if (!fromEnv) {
    throw new AirportDirectoryConfigurationError("OpenAIP tile data is not configured");
  }
  return fromEnv;
};

function readCached(key: string) {
  return tileMemoryCache.get(key) || null;
}

function writeCached(key: string, payload: ContextTileRecord) {
  tileMemoryCache.set(key, payload);
  return payload;
}

function altitudeCacheSuffix(altitudeFtMsl: unknown) {
  const altitude = Number(altitudeFtMsl);
  if (!Number.isFinite(altitude)) return "";
  return `:altitude-ft:${Math.round(altitude)}`;
}

export function clearAviationContextTileCache() {
  tileMemoryCache.clear();
}

export async function getAirspaceTile({
  tile,
  airspaceRepository,
  altitudeFtMsl = null,
}: ContextTileRecord = {}) {
  const cacheKey = `${buildContextTileCacheKey("airspace", tile)}${altitudeCacheSuffix(altitudeFtMsl)}`;
  const cached = readCached(cacheKey);
  if (cached) return cached;
  const bbox = tileToBbox(tile);
  const repository =
    airspaceRepository === undefined
      ? createAirspaceContextRepositoryFromEnv()
      : airspaceRepository;
  if (!repository?.readAirspacesInBounds) {
    throw new AirportDirectoryConfigurationError("Supabase airspace data is not configured");
  }
  const airspaces = await repository.readAirspacesInBounds({
    bbox,
    limit: 100,
    altitudeFtMsl,
  });
  return writeCached(cacheKey, {
    tile,
    bbox,
    cacheKey,
    source: "supabase",
    airspaces,
  });
}

export async function getNavaidTile({
  tile,
  client,
  facilityRepository,
}: ContextTileRecord = {}) {
  const cacheKey = buildContextTileCacheKey("navaids", tile);
  const cached = readCached(cacheKey);
  if (cached) return cached;
  const bbox = tileToBbox(tile);
  const repository =
    facilityRepository === undefined
      ? createAirportFacilityRepositoryFromEnv()
      : facilityRepository;
  if (repository?.readNavaidsInBounds) {
    const navaids = await repository.readNavaidsInBounds({ bbox, limit: 250 });
    return writeCached(cacheKey, {
      tile,
      bbox,
      cacheKey,
      source: "ourairports",
      navaids,
    });
  }

  const openAip = getOpenAipClient(client);
  const documents = await listItems(
    openAip.listNavaids({
      bbox: bboxToOpenAipParam(bbox),
      limit: 100,
      fields: NAVAID_FIELDS,
    }),
  );
  return writeCached(cacheKey, {
    tile,
    bbox,
    cacheKey,
    source: "openaip",
    navaids: documents.map(mapOpenAipNavaid).filter(Boolean),
  });
}

export async function getNavaidCountTile({
  tile,
  client,
  facilityRepository,
}: ContextTileRecord = {}) {
  const cacheKey = buildContextTileCacheKey("navaid-counts", tile);
  const cached = readCached(cacheKey);
  if (cached) return cached;
  const bbox = tileToBbox(tile);
  const repository =
    facilityRepository === undefined
      ? createAirportFacilityRepositoryFromEnv()
      : facilityRepository;
  if (repository?.readNavaidCountInBounds) {
    const count = await repository.readNavaidCountInBounds({ bbox });
    const marker = buildNavaidCountMarker({ tile, bbox, count });
    return writeCached(cacheKey, {
      tile,
      bbox,
      cacheKey,
      source: "ourairports",
      count,
      navaidCounts: marker ? [marker] : [],
    });
  }

  const openAip = getOpenAipClient(client);
  const documents = await listItems(
    openAip.listNavaids({
      bbox: bboxToOpenAipParam(bbox),
      limit: 100,
      fields: "_id",
    }),
  );
  const marker = buildNavaidCountMarker({ tile, bbox, count: documents.length });
  return writeCached(cacheKey, {
    tile,
    bbox,
    cacheKey,
    source: "openaip",
    count: documents.length,
    navaidCounts: marker ? [marker] : [],
  });
}

export async function getWaypointTile({
  tile,
  client,
}: ContextTileRecord = {}) {
  const cacheKey = buildContextTileCacheKey("waypoints", tile);
  const cached = readCached(cacheKey);
  if (cached) return cached;
  const bbox = tileToBbox(tile);
  const openAip = getOpenAipClient(client);
  const documents = await listItems(
    openAip.listReportingPoints({
      bbox: bboxToOpenAipParam(bbox),
      limit: 100,
      fields: REPORTING_POINT_FIELDS,
    }),
  );
  return writeCached(cacheKey, {
    tile,
    bbox,
    cacheKey,
    source: "openaip",
    waypoints: documents.map(mapOpenAipReportingPoint).filter(Boolean),
  });
}
