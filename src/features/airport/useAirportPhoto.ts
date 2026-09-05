import { useQuery } from "@tanstack/react-query";

type AirportPhoto = { src: string; link: string; photographer: string };

export function useAirportPhoto(icao: string, lat: number, lon: number) {
  const ident = icao.trim().toUpperCase();
  return useQuery({
    queryKey: ["airport-photo", ident, lat, lon],
    enabled: Boolean(ident) && Number.isFinite(lat) && Number.isFinite(lon),
    queryFn: async ({ signal }): Promise<AirportPhoto | null> => {
      const query = new URLSearchParams({ lat: String(lat), lon: String(lon) });
      const response = await fetch(
        `/api/proxy/airports/photos/${encodeURIComponent(ident)}?${query}`,
        { signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]) },
      );
      if (!response.ok) throw new Error("Airport photo unavailable");
      const payload = await response.json();
      return payload.photo || null;
    },
    staleTime: 24 * 60 * 60_000,
    gcTime: 24 * 60 * 60_000,
    retry: false,
  });
}
