import {
  fetchAiracAirportDetail,
  fetchAiracAirportIndex,
} from "./nearbyAirportDataClient.js";
import { filterNearbyAirports } from "./nearbyAirportModel.js";
import {
  buildNearbyAirportCacheKey,
  createNearbyAirportSupabaseCacheFromEnv,
} from "../../app/api/dao/nearbyAirports.dao.js";

import {
  NEARBY_AIRPORT_INDEX_CACHE_MS,
} from "./nearbyAirports.models.js";

const indexCache = new Map();

const indexCacheKey = ({ country, minRunwayLength }) =>
  `${country}:${minRunwayLength}`;

const getCachedAirportIndex = async ({
  country,
  minRunwayLength,
  now = Date.now,
  fetchIndex = fetchAiracAirportIndex,
} = {}) => {
  const key = indexCacheKey({ country, minRunwayLength });
  const currentTime = now();
  const cached = indexCache.get(key);
  if (cached && cached.expiresAt > currentTime) return cached.promise;

  const promise = fetchIndex({ country, minRunwayLength });
  indexCache.set(key, {
    expiresAt: currentTime + NEARBY_AIRPORT_INDEX_CACHE_MS,
    promise,
  });

  try {
    return await promise;
  } catch (error) {
    if (indexCache.get(key)?.promise === promise) indexCache.delete(key);
    throw error;
  }
};

const attachRunwayMaps = async (airports, fetchDetail = fetchAiracAirportDetail) => {
  const details = await Promise.all(
    airports.map((airport) =>
      fetchDetail({ icao: airport.icao }).catch((error) => {
        console.warn(
          `[airports/nearby] AIRAC detail load failed for ${airport.icao}`,
          error,
        );
        return null;
      }),
    ),
  );

  return airports.map((airport, index) => ({
    ...airport,
    runwayMap: details[index]?.runwayMap || null,
  }));
};

const logSupabaseCacheWarning = (action, error) => {
  console.warn(`[airports/nearby] Supabase cache ${action} failed`, error);
};

export const getNearbyAirports = async ({
  query,
  airportCache = createNearbyAirportSupabaseCacheFromEnv(),
} = {}) => {
  const airportCacheKey = buildNearbyAirportCacheKey(query);

  if (airportCache) {
    try {
      const cachedPayload = await airportCache.read(airportCacheKey);
      if (cachedPayload) return cachedPayload;
    } catch (error) {
      logSupabaseCacheWarning("read", error);
    }
  }

  const index = await getCachedAirportIndex({
    country: query.country,
    minRunwayLength: query.minRunwayLength,
  });
  const nearbyAirports = filterNearbyAirports({
    focus: { icao: query.icao, lat: query.lat, lon: query.lon },
    airports: index.airports,
    radiusNm: query.radiusNm,
    limit: query.limit,
  });
  const airports = await attachRunwayMaps(nearbyAirports);

  const payload = {
    airports,
    source: index.source,
    radiusNm: query.radiusNm,
    limit: query.limit,
  };

  if (airportCache) {
    try {
      await airportCache.write({
        cacheKey: airportCacheKey,
        query,
        response: payload,
      });
    } catch (error) {
      logSupabaseCacheWarning("write", error);
    }
  }

  return payload;
};
