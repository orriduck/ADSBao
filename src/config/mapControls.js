import {
  ZOOM_AIRPORT,
  ZOOM_APPROACH,
  ZOOM_DETAIL,
} from "../utils/airportMapDisplay.js";

export const MAP_FOCUS_VIDEO_ID = "i4PuYS2Yy2A";

export const MAP_ZOOM_OPTIONS = [
  { value: ZOOM_APPROACH, title: "Approaching view", iconKey: "planeLanding" },
  { value: ZOOM_AIRPORT, title: "Airport view", iconKey: "towerControl" },
  { value: ZOOM_DETAIL, title: "Detail view", iconKey: "crosshair" },
];
