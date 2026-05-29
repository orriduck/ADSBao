import {
  buildNearbyAirportCacheKey,
  createNearbyAirportSupabaseCacheFromEnv,
} from "../../../app/api/dao/nearbyAirports.dao.js";
import {
  createOurAirportsQueriesFromEnv,
} from "../../../app/api/dao/airportDirectory.dao.js";
import {
  buildRunwayMapFromOurAirports,
} from "../map/ourAirportsRunwayMap.js";

const attachOurAirportsRunwayMaps = async (airports, queries) => {
  const runwayRows = await Promise.all(
    airports.map((airport) =>
      queries.getRunwaysByAirport(airport.ident || airport.icao).catch((error) => {
        console.warn(
          `[airports/nearby] OurAirports runway load failed for ${airport.icao}`,
          error,
        );
        return [];
      }),
    ),
  );

  return airports.map((airport, index) => {
    const runways = runwayRows[index] || [];
    return {
      ...airport,
      runwayMap: buildRunwayMapFromOurAirports(
        airport.ident || airport.icao,
        runways,
      ),
    };
  });
};

const getNearbyAirportsFromOurAirports = async ({ query, queries }) => {
  if (!queries) {
    throw new Error("OurAirports nearby query layer is not configured");
  }
  const nearbyAirports = await queries.getNearbyAirportsByPosition({
    lat: query.lat,
    lon: query.lon,
    radiusNm: query.radiusNm,
    limit: query.limit,
    excludeIdent: query.icao,
  });
  const airports = await attachOurAirportsRunwayMaps(nearbyAirports, queries);

  return {
    airports,
    source: "ourairports",
    radiusNm: query.radiusNm,
    limit: query.limit,
  };
};

const logSupabaseCacheWarning = (action, error) => {
  if (action === "write") {
    return;
  }
  console.warn(`[airports/nearby] Supabase cache ${action} failed`, error);
};

export const getNearbyAirports = async ({
  query,
  airportCache = createNearbyAirportSupabaseCacheFromEnv(),
  ourAirportsQueries = createOurAirportsQueriesFromEnv(),
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

  const payload = await getNearbyAirportsFromOurAirports({
    query,
    queries: ourAirportsQueries,
  });

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
