type AirportSearchAirport = {
  icao?: string;
  iata?: string;
  code?: string;
  name?: string;
  city?: string;
  country?: string;
  lat?: unknown;
  lon?: unknown;
  type?: string;
  type_label?: string;
  [key: string]: unknown;
};

type NearbyAirportPromptItem = {
  type: "nearby-prompt";
  id: typeof NEARBY_DISCOVERY_ITEM_ID;
  status: string;
  errorMessage: string;
};

type NearbyAirportEmptyItem = {
  type: "nearby-empty";
  id: "nearby-airports-empty";
  status: string;
};

type NearbyAirportDisplayItem =
  | { type: "airport"; airport: AirportSearchAirport }
  | NearbyAirportPromptItem
  | NearbyAirportEmptyItem;

type AirportDiscoveryTopic = {
  id?: string;
  airports?: readonly AirportSearchAirport[];
  [key: string]: unknown;
};

type NearbyAirportDisplayOptions = {
  airports?: AirportSearchAirport[];
  status?: string;
  errorMessage?: string;
};

type AirportDiscoveryOptions = {
  topics?: readonly AirportDiscoveryTopic[];
};

type AirportSearchMergeOptions = {
  query?: string;
  staticAirports?: AirportSearchAirport[];
  results?: AirportSearchAirport[];
};

type AirportSubmitOptions = {
  query?: string;
  rows?: AirportSearchAirport[];
  staticAirports?: AirportSearchAirport[];
};

const normalizeAirportQuery = (value: unknown) =>
  String(value || "")
    .trim()
    .toUpperCase();

const airportSearchText = (airport: AirportSearchAirport) =>
  [airport?.icao, airport?.iata, airport?.name, airport?.city, airport?.country]
    .join(" ")
    .toUpperCase();

const airportKey = (airport: AirportSearchAirport) =>
  normalizeAirportQuery(airport?.icao || airport?.code || airport?.name);

const NEARBY_DISCOVERY_ITEM_ID = "nearby-airports-prompt";

const airportDisplayItem = (airport: AirportSearchAirport) => ({
  type: "airport",
  airport,
}) satisfies NearbyAirportDisplayItem;

const hasAirportIdentity = (airport: AirportSearchAirport) =>
  Boolean(
    normalizeAirportQuery(
      airport?.icao || airport?.code || airport?.iata || airport?.name,
    ),
  );

export function getNearbyAirportDisplayItems({
  airports = [],
  status = "idle",
  errorMessage = "",
}: NearbyAirportDisplayOptions = {}): NearbyAirportDisplayItem[] {
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

export function getAirportDiscoveryTopics({ topics = [] }: AirportDiscoveryOptions = {}) {
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
}: AirportSearchMergeOptions = {}): AirportSearchAirport[] {
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

export function createAirportSelection(airport: AirportSearchAirport = {}) {
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
}: AirportSubmitOptions = {}) {
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
