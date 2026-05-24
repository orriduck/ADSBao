import { getDistanceNm } from "../../../utils/aircraftTrafficIntent.js";

const normalizeAirportQuery = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

const airportSearchText = (airport) =>
  [airport?.icao, airport?.iata, airport?.name, airport?.city, airport?.country]
    .join(" ")
    .toUpperCase();

const airportKey = (airport) =>
  normalizeAirportQuery(airport?.icao || airport?.code || airport?.name);

export const LOCATION_PROMPT_ITEM_ID = "current-location-airport";

const airportDisplayItem = (airport) => ({
  type: "airport",
  airport,
});

export function getFeaturedAirportDisplayItems({
  featuredAirports = [],
  locationStatus = "idle",
} = {}) {
  const airportItems = featuredAirports.map(airportDisplayItem);
  if (locationStatus === "resolved") return airportItems;

  return [
    {
      type: "location-prompt",
      id: LOCATION_PROMPT_ITEM_ID,
      status: locationStatus,
    },
    ...airportItems,
  ];
}

export function orderFeaturedAirportsByNearest({
  featuredAirports = [],
  location = null,
} = {}) {
  if (!featuredAirports.length || !location) return featuredAirports;

  const distances = featuredAirports
    .map((airport, index) => ({
      index,
      distanceNm: getDistanceNm(location.lat, location.lon, airport?.lat, airport?.lon),
    }))
    .filter(({ distanceNm }) => Number.isFinite(distanceNm))
    .toSorted((left, right) => left.distanceNm - right.distanceNm);

  const nearestIndex = distances[0]?.index;
  if (!Number.isInteger(nearestIndex) || nearestIndex <= 0) {
    return featuredAirports;
  }

  const nearestAirport = featuredAirports[nearestIndex];
  return [
    nearestAirport,
    ...featuredAirports.slice(0, nearestIndex),
    ...featuredAirports.slice(nearestIndex + 1),
  ];
}

export function mergeAirportSearchRows({
  query = "",
  featuredAirports = [],
  results = [],
} = {}) {
  const normalizedQuery = normalizeAirportQuery(query);
  if (!normalizedQuery) return [];

  const matchesFeatured = featuredAirports.filter((airport) =>
    airportSearchText(airport).includes(normalizedQuery),
  );
  const seen = new Set();

  return [...matchesFeatured, ...results].filter((airport) => {
    const key = airportKey(airport);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function createAirportSelection(airport = {}) {
  return {
    code: airport.icao || airport.code,
    icao: airport.icao || airport.code,
    iata: airport.iata || airport.code,
    name: airport.name || airport.code,
    city: airport.city || "",
    country: airport.country || "",
    lat: airport.lat ?? null,
    lon: airport.lon ?? null,
    type: airport.type || "",
    type_label: airport.type_label || "",
  };
}

export function resolveSubmittedAirport({
  query = "",
  rows = [],
  featuredAirports = [],
} = {}) {
  const normalizedQuery = normalizeAirportQuery(query);
  if (!normalizedQuery) return null;

  return (
    [...rows, ...featuredAirports].find((airport) => {
      const icao = normalizeAirportQuery(airport.icao);
      const iata = normalizeAirportQuery(airport.iata);
      const code = normalizeAirportQuery(airport.code);
      return (
        normalizedQuery === icao ||
        normalizedQuery === iata ||
        normalizedQuery === code
      );
    }) ||
    rows[0] ||
    null
  );
}

export const getAirportResultCountLabel = ({ loading, rowCount }) =>
  loading ? "loading" : `${rowCount} result${rowCount === 1 ? "" : "s"}`;
