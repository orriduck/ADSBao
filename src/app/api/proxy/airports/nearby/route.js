import {
  fetchAiracAirportDetail,
  fetchAiracAirportIndex,
} from "@/services/airports/nearbyAirportDataClient.js";
import { filterNearbyAirports } from "@/services/airports/nearbyAirportModel.js";
import { toFiniteNumber } from "@/utils/math.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const DEFAULT_RADIUS_NM = 30;
const DEFAULT_LIMIT = 6;
const DEFAULT_COUNTRY = "US";
const DEFAULT_MIN_RUNWAY_LENGTH = 5000;
const CACHE_MS = 6 * 60 * 60 * 1000;

const indexCache = new Map();

export const runtime = "nodejs";

export function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

const cacheKey = ({ country, minRunwayLength }) =>
  `${country}:${minRunwayLength}`;

const queryNumber = (searchParams, key) => {
  const raw = searchParams.get(key);
  return raw == null || raw === "" ? null : toFiniteNumber(raw);
};

async function getCachedAirportIndex({ country, minRunwayLength, now = Date.now }) {
  const key = cacheKey({ country, minRunwayLength });
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

export async function GET(request) {
  const url = new URL(request.url);
  const lat = queryNumber(url.searchParams, "lat");
  const lon = queryNumber(url.searchParams, "lon");
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
    return Response.json(
      { error: "lat and lon query parameters are required" },
      { status: 400, headers: corsHeaders },
    );
  }

  try {
    const index = await getCachedAirportIndex({ country, minRunwayLength });
    const nearbyAirports = filterNearbyAirports({
      focus: { icao, lat, lon },
      airports: index.airports,
      radiusNm,
      limit,
    });
    const airports = await attachRunwayMaps(nearbyAirports);

    return Response.json(
      {
        airports,
        source: index.source,
        radiusNm,
        limit,
      },
      {
        headers: {
          ...corsHeaders,
          "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (error) {
    console.error("[airports/nearby] AIRAC airport index load failed", error);
    return Response.json(
      { error: "Failed to load nearby airports" },
      { status: 502, headers: corsHeaders },
    );
  }
}
