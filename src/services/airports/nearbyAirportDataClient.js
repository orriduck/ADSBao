import {
  buildAiracAirportIndexUrl,
  AIRAC_API_BASE_URL,
  normalizeAiracAirportDetail,
  normalizeAiracAirport,
} from "./nearbyAirportModel.js";

export const AIRAC_AIRPORT_INDEX_CONFIG = {
  country: "US",
  minRunwayLength: 5000,
  maxPages: 25,
  cacheMs: 6 * 60 * 60 * 1000,
  userAgent: "ADSBao/0.9.0 (https://github.com/orriduck/ADSBao)",
};

export async function fetchAiracAirportIndex({
  fetchImpl = fetch,
  country = AIRAC_AIRPORT_INDEX_CONFIG.country,
  minRunwayLength = AIRAC_AIRPORT_INDEX_CONFIG.minRunwayLength,
  maxPages = AIRAC_AIRPORT_INDEX_CONFIG.maxPages,
} = {}) {
  const airports = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const url = buildAiracAirportIndexUrl({ country, minRunwayLength, page });
    const response = await fetchImpl(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": AIRAC_AIRPORT_INDEX_CONFIG.userAgent,
      },
      next: {
        revalidate: Math.floor(AIRAC_AIRPORT_INDEX_CONFIG.cacheMs / 1000),
      },
    });

    if (!response.ok) {
      throw new Error(`AIRAC airport index request failed (${response.status})`);
    }

    const payload = await response.json();
    const records = Array.isArray(payload?.data) ? payload.data : [];
    airports.push(...records.map(normalizeAiracAirport).filter(Boolean));

    if (records.length === 0 || payload?.pagination?.has_more === false) break;
  }

  return {
    airports,
    source: "airac.net",
  };
}

export async function fetchAiracAirportDetail({
  icao,
  fetchImpl = fetch,
  baseUrl = AIRAC_API_BASE_URL,
} = {}) {
  const normalizedIcao = String(icao || "").trim().toUpperCase();
  if (!normalizedIcao) return null;

  const url = new URL(`${baseUrl}/airports/${normalizedIcao}`);
  const response = await fetchImpl(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": AIRAC_AIRPORT_INDEX_CONFIG.userAgent,
    },
    next: {
      revalidate: Math.floor(AIRAC_AIRPORT_INDEX_CONFIG.cacheMs / 1000),
    },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`AIRAC airport detail request failed (${response.status})`);
  }

  const payload = await response.json();
  return normalizeAiracAirportDetail(payload?.data);
}
