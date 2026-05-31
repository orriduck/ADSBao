// Browser-side wrapper over the `/api/search` and `/api/airport/[ident]`
// routes. Server routes own OpenAIP access so the API key never reaches the
// browser bundle.

const SEARCH_PATH = "/api/search";
const AIRPORT_PATH = "/api/airport";

const defaultFetch = () =>
  typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : null;

const buildSearchUrl = ({
  baseUrl = "",
  query,
  country = "",
  type = "",
  limit,
}: Record<string, any>) => {
  const url = new URL(`${baseUrl}${SEARCH_PATH}`, baseUrl ? undefined : "http://placeholder");
  if (query) url.searchParams.set("q", query);
  if (country) url.searchParams.set("country", country);
  if (type) url.searchParams.set("type", type);
  if (Number.isFinite(limit)) url.searchParams.set("limit", String(limit));
  return baseUrl ? url.toString() : `${url.pathname}${url.search}`;
};

const buildAirportUrl = ({ baseUrl = "", ident, locale = "" }: Record<string, any>) => {
  const safeIdent = encodeURIComponent(String(ident || "").trim().toUpperCase());
  const path = `${baseUrl}${AIRPORT_PATH}/${safeIdent}`;
  const normalizedLocale = String(locale || "").trim();
  if (!normalizedLocale) return path;
  const url = new URL(path, baseUrl ? undefined : "http://placeholder");
  url.searchParams.set("locale", normalizedLocale);
  return baseUrl ? url.toString() : `${url.pathname}${url.search}`;
};

const requestJson = async (fetchImpl: any, url: string) => {
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
}: Record<string, any> = {}) => {
  if (!fetchImpl) {
    throw new Error("Airport directory client requires fetch support");
  }

  const loadAirports = async ({
    query = "",
    country = "",
    kind = "all",
    limit = 60,
  }: Record<string, any> = {}) => {
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
      source: payload.source || "openaip",
    };
  };

  const resolveAirport = async (code: unknown, { locale = "" }: Record<string, any> = {}) => {
    const trimmed = String(code || "").trim().toUpperCase();
    if (!trimmed) {
      throw new Error("Airport code is required");
    }

    const detail = await requestJson(
      fetchImpl,
      buildAirportUrl({ baseUrl, ident: trimmed, locale }),
    );
    if (detail?.airport) {
      return {
        ...detail.airport,
        runways: Array.isArray(detail.runways) ? detail.runways : [],
        frequencies: Array.isArray(detail.frequencies) ? detail.frequencies : [],
        nearbyAirports: Array.isArray(detail.nearbyAirports)
          ? detail.nearbyAirports
          : [],
        nearbyNavaids: Array.isArray(detail.nearbyNavaids)
          ? detail.nearbyNavaids
          : [],
        airspaces: Array.isArray(detail.airspaces) ? detail.airspaces : [],
        reportingPoints: Array.isArray(detail.reportingPoints)
          ? detail.reportingPoints
          : [],
        obstacles: Array.isArray(detail.obstacles) ? detail.obstacles : [],
        runwayMap: detail.runwayMap || null,
      };
    }

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
