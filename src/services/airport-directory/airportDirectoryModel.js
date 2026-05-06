import { toFiniteNumber } from "../../utils/math.js";

export const AIRPORT_DIRECTORY_API_BASE_URL = "https://airportsapi.com/api";
export const AIRPORT_DIRECTORY_API_PAGE_SIZE = 30;

export const AIRPORT_DIRECTORY_KIND_SEQUENCE = [
  "large_airport",
  "medium_airport",
  "small_airport",
  "heliport",
];

const TYPE_RANK = {
  large_airport: 0,
  medium_airport: 1,
  small_airport: 2,
  heliport: 3,
};

export const normalizeAirport = (record, fallbackCountry = "") => {
  const attrs = record?.attributes || record || {};
  const code =
    attrs.icao_code || attrs.gps_code || attrs.code || attrs.local_code || "";
  const type = attrs.type || "";

  return {
    icao: code,
    iata: attrs.iata_code || attrs.local_code || "",
    name: attrs.name || code,
    city: attrs.municipality || "",
    country: attrs.country_code || attrs.iso_country || fallbackCountry,
    lat: toFiniteNumber(attrs.latitude),
    lon: toFiniteNumber(attrs.longitude),
    type,
    type_label: type
      ? type.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase())
      : "",
    code: attrs.code || code,
    source: "airportsapi.com",
  };
};

export const makeAirportKey = (airport) =>
  String(airport.icao || airport.code || airport.name || "")
    .trim()
    .toUpperCase();

export const dedupeAirports = (airports) => {
  const seen = new Set();
  return airports.filter((airport) => {
    const key = makeAirportKey(airport);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const matchesAirportKind = (airport, kind) =>
  kind === "all" || !kind || airport.type === kind;

export const matchesAirportCountry = (airport, country) =>
  !country || String(airport.country || "").toUpperCase() === country;

export const matchesAirportQuery = (airport, query) => {
  const normalizedQuery = query.trim().toUpperCase();
  if (!normalizedQuery) return true;

  const haystack = [
    airport.icao,
    airport.iata,
    airport.code,
    airport.name,
    airport.city,
    airport.country,
  ]
    .join(" ")
    .toUpperCase();

  return haystack.includes(normalizedQuery);
};

export const browseScore = (airport) => [
  TYPE_RANK[airport.type] ?? 9,
  airport.iata ? 0 : 1,
  String(airport.name || ""),
];

export const queryScore = (airport, query) => {
  const normalizedQuery = query.trim().toUpperCase();
  const code = String(airport.icao || airport.code || "").toUpperCase();
  const iata = String(airport.iata || "").toUpperCase();
  const name = String(airport.name || "").toUpperCase();
  const city = String(airport.city || "").toUpperCase();

  if (code === normalizedQuery || iata === normalizedQuery)
    return [0, browseScore(airport)];
  if (code.startsWith(normalizedQuery) || iata.startsWith(normalizedQuery))
    return [1, browseScore(airport)];
  if (name.startsWith(normalizedQuery) || city.startsWith(normalizedQuery))
    return [2, browseScore(airport)];
  if (name.includes(normalizedQuery) || city.includes(normalizedQuery))
    return [3, browseScore(airport)];
  return [9, browseScore(airport)];
};

export const sortAirportsForBrowse = (airports) =>
  [...airports].sort((left, right) => {
    const [leftType, leftIata, leftName] = browseScore(left);
    const [rightType, rightIata, rightName] = browseScore(right);
    return (
      leftType - rightType ||
      leftIata - rightIata ||
      leftName.localeCompare(rightName)
    );
  });

export const sortAirportsForQuery = (airports, query) =>
  [...airports].sort((left, right) => {
    const [leftRank, leftBrowse] = queryScore(left, query);
    const [rightRank, rightBrowse] = queryScore(right, query);
    return (
      leftRank - rightRank ||
      leftBrowse[0] - rightBrowse[0] ||
      leftBrowse[1] - rightBrowse[1] ||
      leftBrowse[2].localeCompare(rightBrowse[2])
    );
  });

export const getNextAirportDirectoryCursor = (payload) => {
  const links = payload?.links;
  if (!links) return null;
  const nextLink = typeof links.next === "string" ? links.next : links.next?.href;
  if (!nextLink) return null;
  const nextUrl = new URL(nextLink);
  return nextUrl.searchParams.get("page[cursor]");
};

export const buildAirportDirectoryEndpoint = ({
  country,
  queryType,
  queryValue,
  kind,
  cursor,
}) => {
  const baseUrl = country
    ? `${AIRPORT_DIRECTORY_API_BASE_URL}/countries/${country}/airports`
    : `${AIRPORT_DIRECTORY_API_BASE_URL}/airports`;
  const url = new URL(baseUrl);
  if (queryType && queryValue) url.searchParams.set(`filter[${queryType}]`, queryValue);
  if (kind && kind !== "all") url.searchParams.set("filter[type]", kind);
  if (cursor) url.searchParams.set("page[cursor]", cursor);
  return url;
};
