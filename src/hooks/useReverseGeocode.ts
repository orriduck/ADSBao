import { useEffect, useState } from "react";
import {
  fetchReverseGeocode,
  type ReverseGeocodeResult,
} from "@/features/location/reverseGeocodeClient";

// Resolve a lat/lon to a localized place (city / county / state /
// country). Cancels out when the coords change so a stale response
// can't clobber the active one. Falls back to `null` on network /
// parse errors — the consumer is expected to show its own fallback
// copy in that case.
export function useReverseGeocode(
  lat: number | null | undefined,
  lon: number | null | undefined,
  language = "en",
) {
  const [result, setResult] = useState<{
    data: ReverseGeocodeResult | null;
    coordinates: { lat: number; lon: number };
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setResult(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    fetchReverseGeocode(lat as number, lon as number, language)
      .then((data) => {
        // Keep the resolved name and its lookup position together while moving.
        if (!cancelled) setResult({ data, coordinates: { lat: lat as number, lon: lon as number } });
      })
      .catch(() => {
        if (!cancelled) setResult(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lon, language]);

  return { data: result?.data ?? null, coordinates: result?.coordinates ?? null, loading };
}
