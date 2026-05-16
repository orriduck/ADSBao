"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AIRPORT_SEARCH_CONFIG,
  FEATURED_AIRPORTS,
} from "../../../config/airportSearch.js";
import { airportDirectoryClient } from "../directory/airportDirectoryClient.js";
import {
  getAirportResultCountLabel,
  mergeAirportSearchRows,
} from "./airportSearchModel.js";

export function useAirportSearch({
  directoryClient = airportDirectoryClient,
  featuredAirports = FEATURED_AIRPORTS,
  config = AIRPORT_SEARCH_CONFIG,
} = {}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const activeRequestId = useRef(0);

  const rows = useMemo(
    () =>
      mergeAirportSearchRows({
        query,
        featuredAirports,
        results,
      }),
    [featuredAirports, query, results],
  );

  const countLabel = getAirportResultCountLabel({
    loading,
    rowCount: rows.length,
  });

  useEffect(() => {
    const timer = setTimeout(
      async () => {
        const trimmed = query.trim();
        const requestId = ++activeRequestId.current;
        if (!trimmed) {
          setResults([]);
          setLoading(false);
          setError(null);
          return;
        }

        setLoading(true);
        setError(null);
        try {
          const payload = await directoryClient.loadAirports({
            query: trimmed,
            country: config.country,
            kind: config.kind,
            limit: config.limit,
          });
          if (requestId !== activeRequestId.current) return;
          setResults(payload.airports || []);
        } catch (err) {
          if (requestId !== activeRequestId.current) return;
          console.error("Airport search failed", err);
          setResults([]);
          setError(err?.message || "Airport directory is unavailable right now");
        } finally {
          if (requestId === activeRequestId.current) setLoading(false);
        }
      },
      query.trim() ? config.debounceMs : 0,
    );

    return () => clearTimeout(timer);
  }, [config, directoryClient, query]);

  return {
    query,
    setQuery,
    rows,
    featuredAirports,
    loading,
    error,
    countLabel,
  };
}
