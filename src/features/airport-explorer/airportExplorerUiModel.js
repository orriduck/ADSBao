import { DEFAULT_ALTITUDE_FOCUS } from "../airport-context/airportContextUiModel.js";
import { ZOOM_APPROACH } from "../../utils/airportMapDisplay.js";

export const DEFAULT_AIRPORT_EXPLORER_UI_STATE = {
  mapZoom: ZOOM_APPROACH,
  showMapLabels: false,
  showTelemetry: true,
  showRunwayBeams: true,
  showRoutingPointBadges: false,
  showAirspaceContext: true,
  altitudeFocus: DEFAULT_ALTITUDE_FOCUS,
};

export function shouldDisableTelemetryForTraffic({
  aircraftCount = 0,
  threshold = 50,
} = {}) {
  const count = Number(aircraftCount);
  const limit = Number(threshold);

  return Number.isFinite(count) && Number.isFinite(limit) && count > limit;
}
