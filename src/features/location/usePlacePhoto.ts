import { useQuery } from "@tanstack/react-query";
import type { ReverseGeocodeResult } from "./reverseGeocodeClient";

type Photo = { src: string; link: string; photographer: string };
type Coordinates = { lat: number; lon: number };

export function placePhotoQuery(
  place: ReverseGeocodeResult | null,
  coordinates: Coordinates | null,
  locale: string,
) {
  const name = (place?.city || place?.county || "").trim();
  if (!name || !coordinates || !Number.isFinite(coordinates.lat) || !Number.isFinite(coordinates.lon)
    || Math.abs(coordinates.lat) > 90 || Math.abs(coordinates.lon) > 180) return "";
  return new URLSearchParams({
    name,
    region: place?.state || place?.countryName || "",
    language: locale.startsWith("zh") ? "zh" : "en",
    // City imagery does not need a new request on each GPS update.
    lat: coordinates.lat.toFixed(1),
    lon: coordinates.lon.toFixed(1),
  }).toString();
}

export function usePlacePhoto(place: ReverseGeocodeResult | null, coordinates: Coordinates | null, locale: string) {
  const query = placePhotoQuery(place, coordinates, locale);
  return useQuery({
    queryKey: ["place-photo", query],
    enabled: Boolean(query),
    queryFn: async ({ signal }): Promise<Photo | null> => {
      const response = await fetch(`/api/proxy/places/photo?${query}`, {
        signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
      });
      if (!response.ok) throw new Error("Place photo unavailable");
      const payload = await response.json();
      return payload.photo || null;
    },
    staleTime: (query) => query.state.data ? 24 * 60 * 60_000 : 5 * 60_000,
    gcTime: 24 * 60 * 60_000,
    retry: false,
  });
}
