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

export const NEARBY_DISCOVERY_ITEM_ID = "nearby-airports-prompt";

const airportDisplayItem = (airport) => ({
  type: "airport",
  airport,
});

const hasAirportIdentity = (airport) =>
  Boolean(
    normalizeAirportQuery(
      airport?.icao || airport?.code || airport?.iata || airport?.name,
    ),
  );

export function getNearbyAirportDisplayItems({
  airports = [],
  status = "idle",
  errorMessage = "",
} = {}) {
  if (status !== "resolved") {
    return [
      {
        type: "nearby-prompt",
        id: NEARBY_DISCOVERY_ITEM_ID,
        status,
        errorMessage: String(errorMessage || ""),
      },
    ];
  }

  const airportItems = airports.filter(hasAirportIdentity).map(airportDisplayItem);
  if (airportItems.length) return airportItems;

  return [
    {
      type: "nearby-empty",
      id: "nearby-airports-empty",
      status,
    },
  ];
}

export function getAirportDiscoveryTopics({ topics = [] } = {}) {
  return topics
    .map((topic) => ({
      ...topic,
      airports: (topic?.airports || []).filter(hasAirportIdentity),
    }))
    .filter((topic) => topic.id && topic.airports.length);
}

export function mergeAirportSearchRows({
  query = "",
  staticAirports = [],
  results = [],
} = {}) {
  const normalizedQuery = normalizeAirportQuery(query);
  if (!normalizedQuery) return [];

  const staticMatches = staticAirports.filter((airport) =>
    airportSearchText(airport).includes(normalizedQuery),
  );
  const seen = new Set();

  return [...staticMatches, ...results].filter((airport) => {
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
  staticAirports = [],
} = {}) {
  const normalizedQuery = normalizeAirportQuery(query);
  if (!normalizedQuery) return null;

  return (
    [...rows, ...staticAirports].find((airport) => {
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
