import { useEffect, useState } from "react";
import { nearbyAirportClient } from "../features/airport/nearby/nearbyAirportClient";
import {
  NEARBY_AIRPORT_DEFAULTS,
  NEARBY_AIRPORT_LIMITS,
} from "../features/airport/nearby/nearbyAirports.models";
import {
  normalizeLatitude,
  normalizeLongitude,
} from "../features/aircraft/tracking/flightTrackingContextModel";

export function useNearbyAirports({
  icao = "",
  lat = 0,
  lon = 0,
  radiusNm = NEARBY_AIRPORT_DEFAULTS.radiusNm,
  limit = NEARBY_AIRPORT_LIMITS.maxLimit,
} = {}) {
  const [airports, setAirports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [settled, setSettled] = useState(false);
  const [error, setError] = useState(null);
  const queryLat = normalizeLatitude(lat);
  const queryLon = normalizeLongitude(lon);

  useEffect(() => {
    let disposed = false;

    const load = async () => {
      if (queryLat == null || queryLon == null) {
        setAirports([]);
        setError(null);
        setLoading(false);
        setSettled(false);
        return;
      }

      setLoading(true);
      setSettled(false);
      setError(null);
      try {
        const payload = await nearbyAirportClient.fetchNearbyAirports({
          icao,
          lat: queryLat,
          lon: queryLon,
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
        if (!disposed) {
          setSettled(true);
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      disposed = true;
    };
  }, [icao, queryLat, queryLon, radiusNm, limit]);

  return {
    airports,
    loading,
    settled,
    error,
  };
}
