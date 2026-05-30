"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAirportWikiSummary } from "../features/airport/wiki/airportWiki.js";
import { useI18n } from "../features/app-shell/i18n/useI18n.js";

// Wiki content barely changes during a session, so the 30-minute staleTime
// avoids hammering Wikipedia when users hop between airports — the second
// time they land on KBOS during the same session the summary paints
// instantly from cache.
const WIKI_STALE_TIME_MS = 30 * 60_000;

export function useAirportWiki(airport) {
  const { locale } = useI18n();
  const airportKey = airport?.icao || airport?.iata || airport?.name || "";

  const query = useQuery({
    queryKey: ["airport-wiki", airportKey, locale],
    queryFn: () => fetchAirportWikiSummary(airport, fetch, { locale }),
    enabled: Boolean(airportKey),
    staleTime: WIKI_STALE_TIME_MS,
  });

  return {
    summary: query.data ?? null,
    loading: query.isPending && query.fetchStatus !== "idle",
    error: query.error ? query.error.message || "Airport summary unavailable" : null,
  };
}
