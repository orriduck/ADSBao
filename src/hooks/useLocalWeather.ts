"use client";

import { useEffect, useState } from "react";
import {
  localWeatherClient,
  normalizeLocalWeather,
} from "../features/aviation/aviationData";

export function useLocalWeather(lat, lon) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchWeather = async () => {
      if (!lat || !lon) {
        setWeather(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const payload = await localWeatherClient.fetchCurrentWeather({ lat, lon });
        if (cancelled) return;
        setWeather(normalizeLocalWeather(payload));
      } catch (e) {
        if (!cancelled) {
          console.warn("Local weather fetch failed:", e.message);
          setError(e.message);
          setWeather(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchWeather();

    return () => {
      cancelled = true;
    };
  }, [lat, lon]);

  return { weather, loading, error };
}
