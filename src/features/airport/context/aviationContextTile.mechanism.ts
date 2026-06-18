import { createAirportFacilityRepositoryFromEnv } from "@/server/dao/airportFacilities.dao";
import { AirportDirectoryConfigurationError } from "../directory/airportDirectory.models";
import {
  createOpenAipClientFromEnv,
} from "../openaip/openAipClient";
import {
  buildNavaidCountMarker,
} from "./aviationContextDisplayModel";
import {
  bboxToOpenAipParam,
  buildContextTileCacheKey,
  tileToBbox,
} from "./aviationContextTileModel";

type ContextTileRecord = Record<string, any>;

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
