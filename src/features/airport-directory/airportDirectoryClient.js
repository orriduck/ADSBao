// Browser-side wrapper over the new `/api/search` and `/api/airport/[ident]`
// routes. Same public surface as the old airportsapi.com client — feature
// code (`useAirportSearch`, `HomeClient`) doesn't need to know that the data
// source has been swapped to OurAirports + Supabase.

const SEARCH_PATH = "/api/search";
const AIRPORT_PATH = "/api/airport";

const defaultFetch = () =>
  typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : null;

const buildSearchUrl = ({ baseUrl = "", query, country, type, limit }) => {
  const url = new URL(`${baseUrl}${SEARCH_PATH}`, baseUrl ? undefined : "http://placeholder");
  if (query) url.searchParams.set("q", query);
  if (country) url.searchParams.set("country", country);
  if (type) url.searchParams.set("type", type);
  if (Number.isFinite(limit)) url.searchParams.set("limit", String(limit));
  return baseUrl ? url.toString() : `${url.pathname}${url.search}`;
};

const buildAirportUrl = ({ baseUrl = "", ident }) => {
  const safeIdent = encodeURIComponent(String(ident || "").trim().toUpperCase());
  return `${baseUrl}${AIRPORT_PATH}/${safeIdent}`;
};

const requestJson = async (fetchImpl, url) => {
  const response = await fetchImpl(url, {
    headers: { Accept: "application/json" },
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Airport directory request failed (${response.status})`);
  }
  return response.json();
};

export const createAirportDirectoryClient = ({
  fetchImpl = defaultFetch(),
  baseUrl = "",
} = {}) => {
  if (!fetchImpl) {
    throw new Error("Airport directory client requires fetch support");
  }

  const loadAirports = async ({
    query = "",
    country = "",
    kind = "all",
    limit = 60,
  } = {}) => {
    const trimmedQuery = String(query || "").trim();
    const normalizedCountry = String(country || "").trim().toUpperCase();
    const normalizedType =
      !kind || kind === "all" ? "" : String(kind);

    const url = buildSearchUrl({
      baseUrl,
      query: trimmedQuery,
      country: normalizedCountry,
      type: normalizedType,
      limit,
    });

    const payload = (await requestJson(fetchImpl, url)) || {};
    return {
      airports: Array.isArray(payload.airports) ? payload.airports : [],
      source: payload.source || "ourairports",
    };
  };

  const resolveAirport = async (code) => {
    const trimmed = String(code || "").trim().toUpperCase();
    if (!trimmed) {
      throw new Error("Airport code is required");
    }

    const detail = await requestJson(
      fetchImpl,
      buildAirportUrl({ baseUrl, ident: trimmed }),
    );
    if (detail?.airport) return detail.airport;

    const searchPayload = await requestJson(
      fetchImpl,
      buildSearchUrl({ baseUrl, query: trimmed, limit: 1 }),
    );
    const fallback = searchPayload?.airports?.[0];
    if (fallback) return fallback;

    throw new Error("Airport not found");
  };

  return { loadAirports, resolveAirport };
};

export const airportDirectoryClient = createAirportDirectoryClient();
