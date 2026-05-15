import { DEFAULT_ALTITUDE_FOCUS } from "../airport-context/airportContextUiModel.js";
import { ZOOM_APPROACH } from "../../utils/airportMapDisplay.js";

export const DEFAULT_AIRPORT_EXPLORER_UI_STATE = {
  mapZoom: ZOOM_APPROACH,
  showMapLabels: false,
  showRunwayBeams: true,
  showRoutingPointBadges: false,
  showAirspaceContext: true,
  altitudeFocus: DEFAULT_ALTITUDE_FOCUS,
};
