"use client";

import { useEffect, useState } from "react";
import { createMetarClient } from "../features/weather/metar/metarClient";
import { normalizeMetarPayload } from "../features/weather/metar/metarModel";

const metarClient = createMetarClient();

export function useMetar(icao) {
  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState(null);
  const [loading, setLoading] = useState(false);
  const [settled, setSettled] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchMetar = async () => {
      if (!icao) {
        setSettled(false);
        return;
      }
      setLoading(true);
      setSettled(false);
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
        if (!cancelled) {
          setSettled(true);
          setLoading(false);
        }
      }
    };

    fetchMetar();
    return () => {
      cancelled = true;
    };
  }, [icao]);

  return { raw, parsed, loading, settled, error };
}
