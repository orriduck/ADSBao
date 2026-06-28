import { useEffect, useRef, useState } from "react";
import { useReverseGeocode } from "./useReverseGeocode";
import {
  buildPlaceKey,
  nextPlaceCoordState,
  type PlaceCoordGateState,
  type PlaceCoords,
} from "@/features/weather/placeWeatherGate";

// Returns coordinates that only advance when the reverse-geocoded place name
// changes. In here-mode the device position updates continuously, but local
// weather is the same across a city, so this freezes the coordinates fed into
// the weather fetch until the user actually crosses into a new place.
//
// When `enabled` is false the input coordinates pass straight through (a fixed
// airport doesn't move, so there's nothing to gate). The reverse-geocode call
// shares the in-memory cache with the identity hero's lookup, so gating costs
// no extra network request.
export function useStablePlaceWeatherCoords(
  lat: number,
  lon: number,
  { enabled = true, language = "en" }: { enabled?: boolean; language?: string } = {},
): PlaceCoords {
  const { data: place } = useReverseGeocode(
    enabled ? lat : null,
    enabled ? lon : null,
    language,
  );
  const placeKey = buildPlaceKey(place);

  const [coords, setCoords] = useState<PlaceCoords>({ lat, lon });
  const stateRef = useRef<PlaceCoordGateState | null>(null);

  useEffect(() => {
    if (!enabled) {
      stateRef.current = null;
      setCoords((current) =>
        current.lat === lat && current.lon === lon ? current : { lat, lon },
      );
      return;
    }
    const next = nextPlaceCoordState(stateRef.current, { lat, lon }, placeKey);
    stateRef.current = next;
    setCoords((current) =>
      current.lat === next.lat && current.lon === next.lon
        ? current
        : { lat: next.lat, lon: next.lon },
    );
  }, [enabled, placeKey, lat, lon]);

  return enabled ? coords : { lat, lon };
}
