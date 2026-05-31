import { DEFAULT_AIRCRAFT_FILTERS } from "../../aircraft/filters/aircraftFilters";
import { ZOOM_APPROACH } from "../../../utils/airportMapDisplay";

export const DEFAULT_AIRPORT_EXPLORER_UI_STATE = {
  mapZoom: ZOOM_APPROACH,
  showMapLabels: false,
  showRunwayBeams: true,
  showRoutingPointBadges: true,
  ...DEFAULT_AIRCRAFT_FILTERS,
};
