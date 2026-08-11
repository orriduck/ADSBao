import { useEffect, useRef, useState } from "react";
import { nearbyAirportClient } from "../features/airport/nearby/nearbyAirportClient";
import { shouldResetNearMeRefreshContent } from "../features/airport/nearby/nearMeRefreshModel";
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
  retainPreviousOnRefresh = false,
} = {}) {
  const [airports, setAirports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [settled, setSettled] = useState(false);
  const [error, setError] = useState(null);
  const hasSettledContentRef = useRef(false);
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
        hasSettledContentRef.current = false;
        return;
      }

      setLoading(true);
      if (
        shouldResetNearMeRefreshContent({
          preservePrevious: retainPreviousOnRefresh,
          hasSettledContent: hasSettledContentRef.current,
        })
      ) {
        setSettled(false);
      }
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
          hasSettledContentRef.current = true;
          setSettled(true);
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      disposed = true;
    };
  }, [icao, limit, queryLat, queryLon, radiusNm, retainPreviousOnRefresh]);

  return {
    airports,
    loading,
    settled,
    error,
  };
}
