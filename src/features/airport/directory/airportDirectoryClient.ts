// Browser-side wrapper over the `/api/search` and `/api/airport/[ident]`
// routes. Server routes own OpenAIP access so the API key never reaches the
// browser bundle.

import { createRequestCache } from "@/utils/requestCache";

const SEARCH_PATH = "/api/search";
const AIRPORT_PATH = "/api/airport";
const DEFAULT_RESPONSE_CACHE_TTL_MS = 5 * 60 * 1000;

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

const buildAirportSurfaceUrl = ({
  baseUrl = "",
  ident,
  scope = "",
}: Record<string, any>) => {
  const safeIdent = encodeURIComponent(String(ident || "").trim().toUpperCase());
  const path = `${baseUrl}${AIRPORT_PATH}/${safeIdent}/surface`;
  const normalizedScope = String(scope || "").trim();
  if (!normalizedScope) return path;
  const url = new URL(path, baseUrl ? undefined : "http://placeholder");
  url.searchParams.set("scope", normalizedScope);
  return baseUrl ? url.toString() : `${url.pathname}${url.search}`;
};

const buildAirportContextUrl = ({ baseUrl = "", ident }: Record<string, any>) => {
  const safeIdent = encodeURIComponent(String(ident || "").trim().toUpperCase());
  return `${baseUrl}${AIRPORT_PATH}/${safeIdent}/context`;
};

const requestJson = async (
  fetchImpl: any,
  url: string,
  { signal }: { signal?: AbortSignal } = {},
) => {
  const response = await fetchImpl(url, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Airport directory request failed (${response.status})`);
  }
  return response.json();
};

const createAirportDirectoryClient = ({
  fetchImpl = defaultFetch(),
  baseUrl = "",
  responseCacheTtlMs = DEFAULT_RESPONSE_CACHE_TTL_MS,
}: Record<string, any> = {}) => {
  if (!fetchImpl) {
    throw new Error("Airport directory client requires fetch support");
  }

  const requestCache = createRequestCache<any>({
    ttlMs: responseCacheTtlMs,
    shouldCache: (payload) => payload !== null,
  });
  const requestJsonOnce = (
    url: string,
    { signal }: { signal?: AbortSignal } = {},
  ) =>
    requestCache.request(
      url,
      () => requestJson(fetchImpl, url, { signal }),
      { coalesce: !signal },
    );

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

    const payload = (await requestJsonOnce(url)) || {};
    return {
      airports: Array.isArray(payload.airports) ? payload.airports : [],
      source: payload.source || "openaip",
    };
  };

  const resolveAirport = async (
    code: unknown,
    { locale = "", signal }: Record<string, any> = {},
  ) => {
    const trimmed = String(code || "").trim().toUpperCase();
    if (!trimmed) {
      throw new Error("Airport code is required");
    }

    const detail = await requestJsonOnce(
      buildAirportUrl({ baseUrl, ident: trimmed, locale }),
      { signal },
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

    const searchPayload = await requestJsonOnce(
      buildSearchUrl({ baseUrl, query: trimmed, limit: 1 }),
      { signal },
    );
    const fallback = searchPayload?.airports?.[0];
    if (fallback) return fallback;

    throw new Error("Airport not found");
  };

  const resolveAirportSurface = async (
    code: unknown,
    { scope = "", signal }: { scope?: string; signal?: AbortSignal } = {},
  ) => {
    const trimmed = String(code || "").trim().toUpperCase();
    if (!trimmed) {
      throw new Error("Airport code is required");
    }

    const payload = await requestJsonOnce(
      buildAirportSurfaceUrl({ baseUrl, ident: trimmed, scope }),
      { signal },
    );
    return payload?.surfaceMap || null;
  };

  const resolveAirportContext = async (
    code: unknown,
    { signal }: { signal?: AbortSignal } = {},
  ) => {
    const trimmed = String(code || "").trim().toUpperCase();
    if (!trimmed) {
      throw new Error("Airport code is required");
    }

    const payload = await requestJsonOnce(
      buildAirportContextUrl({ baseUrl, ident: trimmed }),
      { signal },
    ) || {};
    return {
      nearbyAirports: Array.isArray(payload.nearbyAirports)
        ? payload.nearbyAirports
        : [],
      nearbyNavaids: Array.isArray(payload.nearbyNavaids)
        ? payload.nearbyNavaids
        : [],
      airspaces: Array.isArray(payload.airspaces) ? payload.airspaces : [],
      reportingPoints: Array.isArray(payload.reportingPoints)
        ? payload.reportingPoints
        : [],
      obstacles: Array.isArray(payload.obstacles) ? payload.obstacles : [],
    };
  };

  return {
    loadAirports,
    resolveAirport,
    resolveAirportSurface,
    resolveAirportContext,
  };
};

export const airportDirectoryClient = createAirportDirectoryClient();
export { createAirportDirectoryClient };
