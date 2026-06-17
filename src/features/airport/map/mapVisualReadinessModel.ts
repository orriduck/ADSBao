export const MAP_TILE_READY_CUTOFF_MS = 1_500;
export const MAP_VISUAL_CONTENT_READY_CUTOFF_MS = 1_100;
export const MAP_VISUAL_CONTENT_POLL_MS = 50;
export const MAP_DEFERRED_FOCAL_CENTER_CUTOFF_MS = 2_200;

type LoadingSources = {
  nearbyAirportsLoading?: boolean;
  routeLoadingCount?: number;
  traceLoading?: boolean;
  trackedAircraftLoading?: boolean;
  trafficLoading?: boolean;
  weatherLoading?: boolean;
};

type VisualRequirementsOptions = {
  feedLoading?: boolean;
  renderedAircraftCount?: number;
  traceExpected?: boolean;
};

type VisualReadyOptions = {
  mapCreated?: boolean;
  tilesReady?: boolean;
  aircraftMarkersRequired?: boolean;
  aircraftMarkersReady?: boolean;
  traceRequired?: boolean;
  traceReady?: boolean;
};

type VisualGateKeyOptions = {
  variant?: string;
  icao?: unknown;
  callsign?: unknown;
};

export function hasActiveMapLoadingSource({
  active = false,
  sources = {},
}: {
  active?: boolean;
  sources?: LoadingSources;
} = {}) {
  return Boolean(
    active ||
      sources.trackedAircraftLoading ||
      sources.trafficLoading ||
      sources.weatherLoading ||
      sources.nearbyAirportsLoading ||
      sources.traceLoading ||
      Number(sources.routeLoadingCount) > 0,
  );
}

export function resolveMapVisualRequirements({
  feedLoading = false,
  renderedAircraftCount = 0,
  traceExpected = false,
}: VisualRequirementsOptions = {}) {
  return {
    aircraftMarkersRequired: Boolean(!feedLoading && renderedAircraftCount > 0),
    traceRequired: Boolean(!feedLoading && traceExpected),
  };
}

export function resolveMapVisualReady({
  mapCreated = false,
  tilesReady = false,
  aircraftMarkersRequired = false,
  aircraftMarkersReady = false,
  traceRequired = false,
  traceReady = false,
}: VisualReadyOptions = {}) {
  return Boolean(
    mapCreated &&
      tilesReady &&
      (!aircraftMarkersRequired || aircraftMarkersReady) &&
      (!traceRequired || traceReady),
  );
}

export function resolveMapVisualGateKey({
  variant = "airport",
  icao = "",
  callsign = "",
}: VisualGateKeyOptions = {}) {
  const normalizedVariant = String(variant || "airport").trim() || "airport";
  const normalizedCallsign = String(callsign || "").trim().toUpperCase();
  if (normalizedVariant === "flight" && normalizedCallsign) {
    return `${normalizedVariant}|flight:${normalizedCallsign}`;
  }

  const normalizedIcao = String(icao || "").trim().toUpperCase();
  return `${normalizedVariant}|airport:${normalizedIcao || "moving"}`;
}
