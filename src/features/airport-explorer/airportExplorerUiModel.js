import { DEFAULT_AIRCRAFT_FILTERS } from "../aircraft-filters/aircraftFilters.js";
import { ZOOM_APPROACH } from "../../utils/airportMapDisplay.js";

export const DEFAULT_AIRPORT_EXPLORER_UI_STATE = {
  mapZoom: ZOOM_APPROACH,
  showMapLabels: false,
  showRunwayBeams: true,
  showRoutingPointBadges: false,
  ...DEFAULT_AIRCRAFT_FILTERS,
};
