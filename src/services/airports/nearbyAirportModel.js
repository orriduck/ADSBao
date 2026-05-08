import { getDistanceNm } from "../../utils/aircraftTrafficIntent.js";
import { toFiniteNumber } from "../../utils/math.js";

export const AIRAC_API_BASE_URL = "https://airac.net/api/v1";
export const AIRAC_AIRPORT_INDEX_PAGE_SIZE = 100;

export function buildAiracAirportIndexUrl({
  country = "US",
  minRunwayLength = 5000,
  page = 1,
  baseUrl = AIRAC_API_BASE_URL,
} = {}) {
  const url = new URL(`${baseUrl}/airports`);
  if (country) url.searchParams.set("country", String(country).toUpperCase());
  if (minRunwayLength) {
    url.searchParams.set("min_runway_length", String(minRunwayLength));
  }
  url.searchParams.set("per_page", String(AIRAC_AIRPORT_INDEX_PAGE_SIZE));
  url.searchParams.set("page", String(page));
  return url;
}

export function normalizeAiracAirport(record) {
  const lat = toFiniteNumber(record?.coordinates?.lat ?? record?.latitude);
  const lon = toFiniteNumber(record?.coordinates?.lon ?? record?.longitude);
  const icao = String(record?.icao || "").trim().toUpperCase();
  if (!icao || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return {
    icao,
    iata: String(record?.iata || record?.lid || "").trim().toUpperCase(),
    name: String(record?.name || icao).trim(),
    city: String(record?.city || "").trim(),
    state: String(record?.state || "").trim(),
    country: String(record?.country || "").trim().toUpperCase(),
    lat,
    lon,
    elevationFt: toFiniteNumber(record?.elevation_ft),
    source: "airac.net",
  };
}

export function filterNearbyAirports({
  focus,
  airports = [],
  radiusNm = 30,
  limit = 6,
} = {}) {
  const focusIcao = String(focus?.icao || "").trim().toUpperCase();
  const focusLat = toFiniteNumber(focus?.lat);
  const focusLon = toFiniteNumber(focus?.lon);
  if (!Number.isFinite(focusLat) || !Number.isFinite(focusLon)) return [];

  return airports
    .map((airport) => {
      const distanceNm = getDistanceNm(focusLat, focusLon, airport?.lat, airport?.lon);
      if (distanceNm == null) return null;
      return { ...airport, distanceNm };
    })
    .filter(
      (airport) =>
        airport &&
        airport.icao &&
        airport.icao !== focusIcao &&
        airport.distanceNm <= radiusNm,
    )
    .toSorted((left, right) => left.distanceNm - right.distanceNm)
    .slice(0, limit);
}
