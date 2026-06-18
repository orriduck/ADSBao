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
  const [data, setData] = useState<ReverseGeocodeResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setData(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    fetchReverseGeocode(lat as number, lon as number, language)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lon, language]);

  return { data, loading };
}
