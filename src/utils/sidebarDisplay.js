export const AIRPORT_SIDEBAR_MOBILE_BREAKPOINT = 768;

export const getAirportSidebarMode = (width) =>
  Number(width) < AIRPORT_SIDEBAR_MOBILE_BREAKPOINT ? "mobile" : "desktop";

export const getAirportSidebarOpenForMode = (mode) => mode === "desktop";
