import { useMemo } from "react";

const normalizeAirportIcao = (value: unknown) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

export function useCandidateWatchingSpots({
  airportIcao = "",
  enabled = false,
  spots: sourceSpots = [],
}: {
  airportIcao?: string;
  enabled?: boolean;
  spots?: Record<string, any>[];
}) {
  const normalizedIcao = useMemo(
    () => normalizeAirportIcao(airportIcao),
    [airportIcao],
  );
  const spots = useMemo(() => {
    if (!enabled || !normalizedIcao || !Array.isArray(sourceSpots)) return [];
    return sourceSpots
      .filter((spot) => spot && Number.isFinite(Number(spot.lat)) && Number.isFinite(Number(spot.lon)))
      .slice()
      .sort((left, right) => {
        const leftNumber = Number(left.spotNumber);
        const rightNumber = Number(right.spotNumber);
        if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && leftNumber !== rightNumber) {
          return leftNumber - rightNumber;
        }
        return String(left.name || left.title || "").localeCompare(
          String(right.name || right.title || ""),
        );
      });
  }, [enabled, normalizedIcao, sourceSpots]);
  return {
    loading: false,
    error: "",
    file: null,
    airportIcao: normalizedIcao,
    spots,
    sourceAttribution: "",
  };
}
