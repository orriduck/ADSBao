"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AIRPORT_SEARCH_CONFIG } from "../../../config/airportSearch";
import { AIRPORT_DISCOVERY_TOPICS } from "../../../config/airportDiscovery";
import { airportDirectoryClient } from "../directory/airportDirectoryClient";
import {
  getAirportDiscoveryTopics,
  getAirportResultCountLabel,
  mergeAirportSearchRows,
} from "./airportSearchModel";

export function useAirportSearch({
  directoryClient = airportDirectoryClient,
  discoveryTopics = AIRPORT_DISCOVERY_TOPICS,
  config = AIRPORT_SEARCH_CONFIG,
} = {}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const activeRequestId = useRef(0);

  const airportDiscoveryTopics = useMemo(
    () => getAirportDiscoveryTopics({ topics: discoveryTopics }),
    [discoveryTopics],
  );

  const staticDiscoveryAirports = useMemo(
    () => airportDiscoveryTopics.flatMap((topic) => topic.airports),
    [airportDiscoveryTopics],
  );

  const rows = useMemo(
    () =>
      mergeAirportSearchRows({
        query,
        staticAirports: staticDiscoveryAirports,
        results,
      }),
    [query, results, staticDiscoveryAirports],
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
    discoveryTopics: airportDiscoveryTopics,
    staticDiscoveryAirports,
    loading,
    error,
    countLabel,
  };
}
