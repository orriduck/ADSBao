import { getDistanceNm } from "../../../utils/aircraftTrafficIntent.js";
import { toFiniteNumber } from "../../../utils/math.js";

export const AIRAC_API_BASE_URL = "https://airac.net/api/v1";
export const AIRAC_AIRPORT_INDEX_PAGE_SIZE = 100;
const FEET_TO_METERS = 0.3048;
const METERS_PER_DEGREE_LATITUDE = 111_320;

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

const metersPerDegreeLongitude = (latitude) =>
  METERS_PER_DEGREE_LATITUDE * Math.cos((latitude * Math.PI) / 180);

const offsetPoint = ({ lat, lon, bearingDegrees, distanceMeters }) => {
  const radians = (bearingDegrees * Math.PI) / 180;
  const eastMeters = Math.sin(radians) * distanceMeters;
  const northMeters = Math.cos(radians) * distanceMeters;
  return {
    lat: lat + northMeters / METERS_PER_DEGREE_LATITUDE,
    lon: lon + eastMeters / metersPerDegreeLongitude(lat),
  };
};

const normalizeAiracRunway = ({ airport, runway }) => {
  const lengthFt = toFiniteNumber(runway?.length_ft);
  const bearing = toFiniteNumber(runway?.base_bearing);
  const baseIdent = String(runway?.base_identifier || "").trim();
  const reciprocalIdent = String(runway?.reciprocal_identifier || "").trim();
  if (!lengthFt || !Number.isFinite(bearing) || !baseIdent || !reciprocalIdent) {
    return null;
  }

  const halfLengthMeters = (lengthFt * FEET_TO_METERS) / 2;
  const baseEnd = offsetPoint({
    lat: airport.lat,
    lon: airport.lon,
    bearingDegrees: bearing,
    distanceMeters: -halfLengthMeters,
  });
  const reciprocalEnd = offsetPoint({
    lat: airport.lat,
    lon: airport.lon,
    bearingDegrees: bearing,
    distanceMeters: halfLengthMeters,
  });
  const id = runway.identifier || `${baseIdent}/${reciprocalIdent}`;
  const ends = [
    { ident: baseIdent, ...baseEnd },
    { ident: reciprocalIdent, ...reciprocalEnd },
  ];

  return {
    id,
    ends,
    centerline: {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: ends.map((end) => [end.lon, end.lat]),
      },
      properties: {
        id,
        airport: airport.icao,
        source: "AIRAC approximate",
        ends: ends.map((end) => end.ident),
      },
    },
  };
};

export function normalizeAiracAirportDetail(record) {
  const airport = normalizeAiracAirport(record);
  if (!airport) return null;
  const runways = (record?.runways || [])
    .map((runway) => normalizeAiracRunway({ airport, runway }))
    .filter(Boolean);

  return {
    ...airport,
    runwayMap: {
      airport: airport.icao,
      source: "AIRAC approximate",
      cycle: "",
      runways,
    },
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
