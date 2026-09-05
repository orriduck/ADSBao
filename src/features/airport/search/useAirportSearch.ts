import { useEffect, useMemo, useState } from "react";
import { AIRPORT_SEARCH_CONFIG } from "../../../config/airportSearch";
import { AIRPORT_DISCOVERY_TOPICS } from "../../../config/airportDiscovery";
import { airportDirectoryClient } from "../directory/airportDirectoryClient";
import { getAirportDiscoveryTopics, mergeAirportSearchRows } from "./airportSearchModel";

export function useAirportSearch({
  directoryClient = airportDirectoryClient,
  discoveryTopics = AIRPORT_DISCOVERY_TOPICS,
  config = AIRPORT_SEARCH_CONFIG,
} = {}) {
  const [query, setQuery] = useState("");
  const [retryCycle, setRetryCycle] = useState(0);
  const [response, setResponse] = useState({
    query: "", rows: [], error: null, cycle: 0,
  });
  const trimmed = query.trim();
  const airportDiscoveryTopics = useMemo(
    () => getAirportDiscoveryTopics({ topics: discoveryTopics as any }), [discoveryTopics],
  );
  const staticDiscoveryAirports = useMemo(
    () => airportDiscoveryTopics.flatMap((topic) => topic.airports), [airportDiscoveryTopics],
  );
  // Never merge results belonging to the previous input, including during debounce.
  const current = response.query === trimmed && response.cycle === retryCycle;
  const rows = useMemo(() => mergeAirportSearchRows({
    query, staticAirports: staticDiscoveryAirports, results: current ? response.rows : [],
  }), [query, staticDiscoveryAirports, current, response.rows]);

  useEffect(() => {
    let cancelled = false;
    if (!trimmed) return;
    const timer = setTimeout(async () => {
      try {
        const payload = await directoryClient.loadAirports({
          query: trimmed, country: config.country, kind: config.kind, limit: config.limit,
        });
        if (cancelled) return;
        setResponse({ query: trimmed, rows: payload.airports || [], error: null,
          cycle: retryCycle });
      } catch (error) {
        if (cancelled) return;
        setResponse({ query: trimmed, rows: [], error: error?.message || "Search unavailable",
          cycle: retryCycle });
      }
    }, config.debounceMs);
    return () => {
      clearTimeout(timer);
      cancelled = true;
    };
  }, [config, directoryClient, trimmed, retryCycle]);

  return {
    query, setQuery, rows, discoveryTopics: airportDiscoveryTopics, staticDiscoveryAirports,
    loading: Boolean(trimmed && !current),
    error: current ? response.error : null,
    retry: () => setRetryCycle((cycle) => cycle + 1),
  };
}
