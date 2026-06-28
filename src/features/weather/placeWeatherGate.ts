// In here-mode the device position streams in continuously (GPS jitter plus
// `watchPosition`). Feeding every micro-update straight into the local-weather
// fetch makes the briefing card reload constantly. Local weather only changes
// at a place granularity, so we keep a snapshot of the coordinates the weather
// was last fetched for and only advance it when the reverse-geocoded place
// identity changes.

export type PlaceCoords = { lat: number; lon: number };

export type PlaceCoordGateState = {
  // The place identity the snapshot was taken for. `null` means "not seeded
  // yet"; `""` means "seeded before the geocode resolved a name".
  placeKey: string | null;
  lat: number;
  lon: number;
};

// Build a stable identity string from a reverse-geocode result. Coarser than
// the raw coordinates on purpose: only a real change of city / county / state /
// country should advance the weather fetch. Returns "" while no place is known.
export function buildPlaceKey(
  place: {
    countryCode?: string;
    state?: string;
    county?: string;
    city?: string;
  } | null,
): string {
  if (!place) return "";
  const parts = [place.countryCode, place.state, place.county, place.city]
    .map((part) => String(part || "").trim())
    .filter(Boolean);
  return parts.join("|");
}

// Decide the next gate state given the latest live position and resolved place
// key. The very first fix seeds the snapshot so weather can load immediately;
// after that only a genuine place change moves it.
export function nextPlaceCoordState(
  state: PlaceCoordGateState | null,
  live: PlaceCoords,
  placeKey: string,
): PlaceCoordGateState {
  // First fix — seed the snapshot at the current position regardless of
  // whether the place name has resolved yet.
  if (!state || state.placeKey === null) {
    return { placeKey, lat: live.lat, lon: live.lon };
  }
  // Seeded before the geocode resolved: adopt the first real place name
  // without moving the snapshot — it already describes this location.
  if (state.placeKey === "") {
    return placeKey ? { placeKey, lat: state.lat, lon: state.lon } : state;
  }
  // A real change of place advances the snapshot to the current position.
  if (placeKey && placeKey !== state.placeKey) {
    return { placeKey, lat: live.lat, lon: live.lon };
  }
  return state;
}
