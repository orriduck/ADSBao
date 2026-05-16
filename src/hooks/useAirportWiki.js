"use client";

import { useEffect, useState } from "react";
import { fetchAirportWikiSummary } from "../features/airport-wiki/airportWiki.js";

export function useAirportWiki(airport) {
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
        const next = await fetchAirportWikiSummary(airport);
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
  }, [airport, airport?.name, airport?.icao, airport?.iata]);

  return { summary, loading, error };
}
