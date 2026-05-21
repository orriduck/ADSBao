import {
  ZOOM_AIRPORT,
  ZOOM_APPROACH,
  ZOOM_DETAIL,
} from "../utils/airportMapDisplay.js";

// Per-primary focus-mode YouTube video. The map is keyed by the same
// values the primary-color hook uses (yellow / teal) so switching the
// accent palette also swaps the focus-mode audio.
export const MAP_FOCUS_VIDEO_BY_PRIMARY = {
  yellow: "i4PuYS2Yy2A",
  teal: "VmTfpAgX2AU",
};
export const MAP_FOCUS_VIDEO_DEFAULT = MAP_FOCUS_VIDEO_BY_PRIMARY.yellow;
// Backwards-compat re-export — left for any caller still expecting the
// single-ID form.
export const MAP_FOCUS_VIDEO_ID = MAP_FOCUS_VIDEO_DEFAULT;

export const MAP_ZOOM_OPTIONS = [
  { value: ZOOM_APPROACH, title: "Approaching view", iconKey: "planeLanding" },
  { value: ZOOM_AIRPORT, title: "Airport view", iconKey: "towerControl" },
  { value: ZOOM_DETAIL, title: "Detail view", iconKey: "crosshair" },
];
