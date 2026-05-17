"use client";

import { useEffect, useState } from "react";
import { nearbyAirportClient } from "../features/airport/nearby/nearbyAirportClient.js";

export function useNearbyAirports({
  icao = "",
  lat = 0,
  lon = 0,
  radiusNm = 40,
  limit = 6,
} = {}) {
  const [airports, setAirports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let disposed = false;

    const load = async () => {
      if (!lat || !lon) {
        setAirports([]);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const payload = await nearbyAirportClient.fetchNearbyAirports({
          icao,
          lat,
          lon,
          radiusNm,
          limit,
        });
        if (disposed) return;
        setAirports(payload.airports || []);
      } catch (nextError) {
        if (disposed) return;
        setAirports([]);
        setError(nextError);
        console.warn("[nearby-airports] load failed", nextError);
      } finally {
        if (!disposed) setLoading(false);
      }
    };

    load();

    return () => {
      disposed = true;
    };
  }, [icao, lat, lon, radiusNm, limit]);

  return {
    airports,
    loading,
    error,
  };
}
