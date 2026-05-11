import {
  createCorsPreflightResponse,
  enforceProxyRequest,
  jsonProxyResponse,
  normalizeLatitude,
  normalizeLongitude,
} from "@/services/apiProxySecurity.js";
import {
  fetchAiracAirportDetail,
  fetchAiracAirportIndex,
} from "@/services/airports/nearbyAirportDataClient.js";
import { createAirportMetadataSupabaseCacheFromEnv } from "@/services/airports/airportMetadataSupabaseCache.js";
import { filterNearbyAirports } from "@/services/airports/nearbyAirportModel.js";
import {
  buildNearbyAirportCacheKey,
  createNearbyAirportSupabaseCacheFromEnv,
} from "@/services/airports/nearbyAirportSupabaseCache.js";
import { toFiniteNumber } from "@/utils/math.js";

const rateLimit = {
  key: "proxy:nearby-airports",
  maxRequests: 45,
  windowMs: 60_000,
};

const DEFAULT_RADIUS_NM = 30;
const DEFAULT_LIMIT = 6;
const DEFAULT_COUNTRY = "US";
const DEFAULT_MIN_RUNWAY_LENGTH = 5000;
const CACHE_MS = 6 * 60 * 60 * 1000;

const indexCache = new Map();

export const runtime = "nodejs";

export function OPTIONS(request) {
  return createCorsPreflightResponse(request);
}

const indexCacheKey = ({ country, minRunwayLength }) =>
  `${country}:${minRunwayLength}`;

const queryNumber = (searchParams, key) => {
  const raw = searchParams.get(key);
  return raw == null || raw === "" ? null : toFiniteNumber(raw);
};

async function getCachedAirportIndex({ country, minRunwayLength, now = Date.now }) {
  const key = indexCacheKey({ country, minRunwayLength });
  const currentTime = now();
  const cached = indexCache.get(key);
  if (cached && cached.expiresAt > currentTime) return cached.promise;

  const promise = fetchAiracAirportIndex({ country, minRunwayLength });
  indexCache.set(key, {
    expiresAt: currentTime + CACHE_MS,
    promise,
  });

  try {
    return await promise;
  } catch (error) {
    if (indexCache.get(key)?.promise === promise) indexCache.delete(key);
    throw error;
  }
}

async function attachRunwayMaps(airports) {
  const details = await Promise.all(
    airports.map((airport) =>
      fetchAiracAirportDetail({ icao: airport.icao }).catch((error) => {
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
}

const nearbyCacheHeaders = {
  "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
};

const logSupabaseCacheWarning = (action, error) => {
  console.warn(`[airports/nearby] Supabase cache ${action} failed`, error);
};

const writeAirportMetadata = async (airports) => {
  const metadataCache = createAirportMetadataSupabaseCacheFromEnv();
  if (!metadataCache) return;
  try {
    await metadataCache.writeMany(airports);
  } catch (error) {
    console.warn("[airports/nearby] Supabase metadata cache write failed", error);
  }
};

export async function GET(request) {
  const securityResponse = enforceProxyRequest(request, { rateLimit });
  if (securityResponse) return securityResponse;

  const url = new URL(request.url);
  const lat = normalizeLatitude(url.searchParams.get("lat"));
  const lon = normalizeLongitude(url.searchParams.get("lon"));
  const icao = String(url.searchParams.get("icao") || "").trim().toUpperCase();
  const radiusNm =
    queryNumber(url.searchParams, "radiusNm") || DEFAULT_RADIUS_NM;
  const limit = queryNumber(url.searchParams, "limit") || DEFAULT_LIMIT;
  const country = String(url.searchParams.get("country") || DEFAULT_COUNTRY)
    .trim()
    .toUpperCase();
  const minRunwayLength =
    queryNumber(url.searchParams, "minRunwayLength") || DEFAULT_MIN_RUNWAY_LENGTH;

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return jsonProxyResponse(
      request,
      { error: "lat and lon query parameters are required" },
      { status: 400 },
    );
  }

  if (
    radiusNm < 1 ||
    radiusNm > 100 ||
    limit < 1 ||
    limit > 12 ||
    minRunwayLength < 0 ||
    minRunwayLength > 20_000 ||
    !/^[A-Z]{2}$/.test(country) ||
    (icao && !/^[A-Z0-9]{3,4}$/.test(icao))
  ) {
    return jsonProxyResponse(
      request,
      { error: "Invalid nearby airport query" },
      { status: 400 },
    );
  }

  try {
    const cacheQuery = {
      country,
      minRunwayLength,
      icao,
      lat,
      lon,
      radiusNm,
      limit,
    };
    const airportCache = createNearbyAirportSupabaseCacheFromEnv();
    const airportCacheKey = buildNearbyAirportCacheKey(cacheQuery);

    if (airportCache) {
      try {
        const cachedPayload = await airportCache.read(airportCacheKey);
        if (cachedPayload) {
          return jsonProxyResponse(request, cachedPayload, {
            headers: nearbyCacheHeaders,
          });
        }
      } catch (error) {
        logSupabaseCacheWarning("read", error);
      }
    }

    const index = await getCachedAirportIndex({ country, minRunwayLength });
    const nearbyAirports = filterNearbyAirports({
      focus: { icao, lat, lon },
      airports: index.airports,
      radiusNm,
      limit,
    });
    await writeAirportMetadata(nearbyAirports);
    const airports = await attachRunwayMaps(nearbyAirports);

    const payload = {
      airports,
      source: index.source,
      radiusNm,
      limit,
    };

    if (airportCache) {
      try {
        await airportCache.write({
          cacheKey: airportCacheKey,
          query: cacheQuery,
          response: payload,
        });
      } catch (error) {
        logSupabaseCacheWarning("write", error);
      }
    }

    return jsonProxyResponse(request, payload, {
      headers: nearbyCacheHeaders,
    });
  } catch (error) {
    console.error("[airports/nearby] AIRAC airport index load failed", error);
    return jsonProxyResponse(
      request,
      { error: "Failed to load nearby airports" },
      { status: 502 },
    );
  }
}
