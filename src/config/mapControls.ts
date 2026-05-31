import {
  ZOOM_AIRPORT,
  ZOOM_APPROACH,
  ZOOM_DETAIL,
} from "../utils/airportMapDisplay";

export const MAP_ZOOM_OPTIONS = [
  { value: ZOOM_APPROACH, title: "Approaching view", iconKey: "planeLanding" },
  { value: ZOOM_AIRPORT, title: "Airport view", iconKey: "towerControl" },
  { value: ZOOM_DETAIL, title: "Detail view", iconKey: "crosshair" },
];
