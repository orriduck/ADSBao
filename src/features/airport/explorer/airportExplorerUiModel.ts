import { DEFAULT_AIRCRAFT_FILTERS } from "../../aircraft/filters/aircraftFilters";
import { ZOOM_APPROACH } from "../../../utils/airportMapDisplay";

export const DEFAULT_AIRPORT_EXPLORER_UI_STATE = {
  mapZoom: ZOOM_APPROACH,
  showMapLabels: false,
  showRunwayBeams: true,
  showNavaidMarkers: false,
  showAirspaces: true,
  ...DEFAULT_AIRCRAFT_FILTERS,
};

const finiteZoomOr = (value: unknown, fallback: number) => {
  if (value == null || value === "") return fallback;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export function resolveSpottingMetricZoomState({
  activeView = "",
  currentZoom = ZOOM_APPROACH,
  previousZoom = null,
  detailZoom,
  fallbackZoom = ZOOM_APPROACH,
}: Record<string, any> = {}) {
  const fallback = finiteZoomOr(fallbackZoom, ZOOM_APPROACH);
  if (activeView === "spotting") {
    return {
      nextZoom: finiteZoomOr(previousZoom, fallback),
      nextPreviousZoom: null,
    };
  }

  return {
    nextZoom: finiteZoomOr(detailZoom, fallback),
    nextPreviousZoom: finiteZoomOr(currentZoom, fallback),
  };
}
