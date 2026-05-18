"use client";

import { useEffect, useState } from "react";
import { fetchAirportWikiSummary } from "../features/airport/wiki/airportWiki.js";
import { useI18n } from "../features/app-shell/i18n/useI18n.js";

export function useAirportWiki(airport) {
  const { locale } = useI18n();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setSummary(null);
      setError(null);
      if (!airport?.name && !airport?.icao && !airport?.iata) return;
      setLoading(true);
      try {
        const next = await fetchAirportWikiSummary(airport, fetch, { locale });
        if (!cancelled) setSummary(next);
      } catch (err) {
        if (!cancelled) setError(err?.message || "Airport summary unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [airport, airport?.name, airport?.icao, airport?.iata, locale]);

  return { summary, loading, error };
}
