import { AIRPORT_EXPLORER_UI_CONFIG } from "../config/aviation";

const AIRPORT_SIDEBAR_MOBILE_BREAKPOINT =
  AIRPORT_EXPLORER_UI_CONFIG.mobileBreakpointPx;

export const getAirportSidebarMode = (width) =>
  Number(width) < AIRPORT_SIDEBAR_MOBILE_BREAKPOINT ? "mobile" : "desktop";

export const getAirportSidebarOpenForMode = (mode) => mode === "desktop";
