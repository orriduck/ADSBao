import { withAuditLogging } from "../../utils/apiLogger.js";
import { createAirportMetadataSupabaseCacheFromEnv } from "../airports/airportMetadataSupabaseCache.js";
import { readResponseJson } from "../apiProxySecurity.js";
import { createAirportDirectoryCache } from "./airportDirectoryCache.js";
import {
  AIRPORT_DIRECTORY_API_BASE_URL,
  AIRPORT_DIRECTORY_API_PAGE_SIZE,
  AIRPORT_DIRECTORY_KIND_SEQUENCE,
  buildAirportDirectoryEndpoint,
  dedupeAirports,
  getNextAirportDirectoryCursor,
  matchesAirportCountry,
  matchesAirportKind,
  matchesAirportQuery,
  normalizeAirport,
  sortAirportsForBrowse,
  sortAirportsForQuery,
} from "./airportDirectoryModel.js";

export const createAirportDirectoryClient = ({
  fetchImpl = globalThis.fetch?.bind(globalThis),
  storage,
  now = () => Date.now(),
  ttlMs,
  metadataCache = createAirportMetadataSupabaseCacheFromEnv({ now }),
} = {}) => {
  if (!fetchImpl) {
    throw new Error("Airport directory client requires fetch support");
  }

  const { getCached, setCached } = createAirportDirectoryCache({
    storage,
    now,
    ttlMs,
  });

  const auditedFetch = withAuditLogging(fetchImpl, { service: "airportsapi.com" });

  const writeAirportMetadata = async (airports) => {
    if (!metadataCache) return;
    try {
      await metadataCache.writeMany(airports);
    } catch (error) {
      console.warn("[airport-directory] Supabase metadata cache write failed", error);
    }
  };

  const fetchJson = async (url, { allow404 = false } = {}) => {
    const response = await auditedFetch(url, {
      headers: {
        Accept: "application/json, application/vnd.api+json",
      },
    });

    if (allow404 && response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Airport directory request failed (${response.status})`);
    }
    return readResponseJson(response, {
      label: `Airport directory response from ${url}`,
      maxBytes: 2 * 1024 * 1024,
    });
  };

  const fetchPagedAirports = async ({
    country = "",
    kind = "all",
    limit = 60,
    queryType = "",
    queryValue = "",
  }) => {
    const airports = [];
    let cursor = null;

    while (airports.length < limit) {
      const payload = await fetchJson(
        buildAirportDirectoryEndpoint({
          country,
          kind,
          queryType,
          queryValue,
          cursor,
        }).toString(),
      );
      airports.push(
        ...(payload?.data || [])
          .map((record) => normalizeAirport(record, country))
          .filter((airport) => airport.icao || airport.code || airport.name),
      );

      cursor = getNextAirportDirectoryCursor(payload);
      if (!cursor) break;
    }

    return airports;
  };

  const loadBrowseAirports = async ({ country = "", kind = "all", limit = 60 }) => {
    const normalizedCountry = String(country || "").trim().toUpperCase();
    const normalizedKind = kind || "all";
    const cacheKey = `browse:${normalizedCountry}:${normalizedKind}:${limit}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const kindsToLoad =
      normalizedKind === "all"
        ? AIRPORT_DIRECTORY_KIND_SEQUENCE
        : [normalizedKind];
    const collected = [];

    for (const nextKind of kindsToLoad) {
      const remaining = Math.max(limit - collected.length, AIRPORT_DIRECTORY_API_PAGE_SIZE);
      const airports = await fetchPagedAirports({
        country: normalizedCountry,
        kind: nextKind,
        limit: remaining,
      });
      collected.push(...airports);
      if (dedupeAirports(collected).length >= limit) break;
    }

    const airports = sortAirportsForBrowse(
      dedupeAirports(collected).filter(
        (airport) =>
          matchesAirportCountry(airport, normalizedCountry) &&
          matchesAirportKind(airport, normalizedKind),
      ),
    ).slice(0, limit);

    const payload = {
      airports,
      source: "airportsapi.com",
    };
    await writeAirportMetadata(airports);
    return setCached(cacheKey, payload);
  };

  const searchAirports = async ({ query, country = "", kind = "all", limit = 60 }) => {
    const trimmed = String(query || "").trim();
    const normalizedCountry = String(country || "").trim().toUpperCase();
    const normalizedKind = kind || "all";
    const cacheKey = `search:${trimmed}:${normalizedCountry}:${normalizedKind}:${limit}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const upper = trimmed.toUpperCase();
    const candidates = [];

    if (/^[A-Z0-9]{4}$/.test(upper)) {
      const exactPayload = await fetchJson(
        `${AIRPORT_DIRECTORY_API_BASE_URL}/airports/${upper}`,
        { allow404: true },
      );
      if (exactPayload?.data) {
        candidates.push(normalizeAirport(exactPayload.data));
      }
    }

    const [codeMatches, nameMatches] = await Promise.all([
      fetchPagedAirports({
        country: normalizedCountry,
        kind: normalizedKind === "all" ? "all" : normalizedKind,
        limit,
        queryType: "code",
        queryValue: upper,
      }),
      fetchPagedAirports({
        country: normalizedCountry,
        kind: normalizedKind === "all" ? "all" : normalizedKind,
        limit,
        queryType: "name",
        queryValue: trimmed,
      }),
    ]);

    candidates.push(...codeMatches, ...nameMatches);

    if (normalizedCountry) {
      const browseMatches = await loadBrowseAirports({
        country: normalizedCountry,
        kind: normalizedKind,
        limit: Math.max(limit, 60),
      });
      candidates.push(
        ...browseMatches.airports.filter((airport) =>
          matchesAirportQuery(airport, trimmed),
        ),
      );
    }

    const airports = sortAirportsForQuery(
      dedupeAirports(candidates).filter(
        (airport) =>
          matchesAirportCountry(airport, normalizedCountry) &&
          matchesAirportKind(airport, normalizedKind) &&
          matchesAirportQuery(airport, trimmed),
      ),
      trimmed,
    ).slice(0, limit);

    const payload = {
      airports,
      source: "airportsapi.com",
    };
    await writeAirportMetadata(airports);
    return setCached(cacheKey, payload);
  };

  return {
    async loadAirports({ query = "", country = "", kind = "all", limit = 60 } = {}) {
      if (String(query || "").trim()) {
        return searchAirports({ query, country, kind, limit });
      }
      return loadBrowseAirports({ country, kind, limit });
    },
    async resolveAirport(code) {
      const trimmed = String(code || "").trim().toUpperCase();
      if (!trimmed) {
        throw new Error("Airport code is required");
      }

      if (metadataCache) {
        try {
          const cachedAirport = await metadataCache.read(trimmed);
          if (cachedAirport) return cachedAirport;
        } catch (error) {
          console.warn("[airport-directory] Supabase metadata cache read failed", error);
        }
      }

      const exactPayload = await fetchJson(
        `${AIRPORT_DIRECTORY_API_BASE_URL}/airports/${trimmed}`,
        { allow404: true },
      );
      if (exactPayload?.data) {
        const airport = normalizeAirport(exactPayload.data);
        await writeAirportMetadata([airport]);
        return airport;
      }

      const result = await searchAirports({ query: trimmed, limit: 1 });
      if (result.airports[0]) return result.airports[0];

      throw new Error("Airport not found");
    },
  };
};

export const airportDirectoryClient = createAirportDirectoryClient();
