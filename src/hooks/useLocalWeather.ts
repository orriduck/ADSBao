import { useEffect, useState } from "react";
import { createLocalWeatherClient } from "../features/weather/localWeatherClient";
import { normalizeLocalWeather } from "../features/weather/localWeatherNormalizer";
import {
  readErrorStatus,
  readResponseStatus,
} from "../features/aviation/httpClient";

const localWeatherClient = createLocalWeatherClient();

export function useLocalWeather(lat, lon) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchWeather = async () => {
      if (!lat || !lon) {
        setWeather(null);
        setLoading(false);
        setError(null);
        setStatusCode(null);
        return;
      }

      setLoading(true);
      setError(null);
      // Clear stale weather from a previous context (airport switch)
      // so the briefing stack never shows the last airport's temp.
      setWeather(null);
      setStatusCode(null);

      try {
        const payload = await localWeatherClient.fetchCurrentWeather({ lat, lon });
        if (cancelled) return;
        setWeather(normalizeLocalWeather(payload));
        setStatusCode(readResponseStatus(payload) ?? 200);
      } catch (e) {
        if (!cancelled) {
          console.warn("Local weather fetch failed:", e.message);
          setError(e.message);
          setStatusCode(readErrorStatus(e));
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

  return { weather, loading, error, statusCode };
}
