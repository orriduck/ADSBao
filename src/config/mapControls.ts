import {
  ZOOM_AIRPORT,
  ZOOM_APPROACH,
  ZOOM_DETAIL,
} from "../utils/airportMapDisplay";

export const MAP_ZOOM_OPTIONS = [
  { value: ZOOM_APPROACH, labelKey: "map.viewFar", iconKey: "radar" },
  { value: ZOOM_AIRPORT, labelKey: "map.viewMedium", iconKey: "scanSearch" },
  { value: ZOOM_DETAIL, labelKey: "map.viewNear", iconKey: "crosshair" },
];
