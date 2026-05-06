"use client";

import { useEffect, useState } from "react";
import { normalizeMetarPayload } from "../features/metar/metarModel.js";
import { metarClient } from "../services/aviationData.js";

export function useMetar(icao) {
  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchMetar = async () => {
      if (!icao) return;
      setLoading(true);
      setError(null);
      try {
        const json = await metarClient.fetchMetar(icao);
        if (cancelled) return;
        const normalized = normalizeMetarPayload(json);
        setRaw(normalized.raw);
        setParsed(normalized.parsed);
      } catch (e) {
        if (!cancelled) {
          console.warn("METAR fetch failed:", e.message);
          setError(e.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchMetar();
    return () => {
      cancelled = true;
    };
  }, [icao]);

  return { raw, parsed, loading, error };
}
