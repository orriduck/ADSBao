import { AIRPORT_EXPLORER_UI_CONFIG } from "../config/aviation";
import type { ClientDeviceProfile } from "@/features/app-shell/device/clientDeviceModel";

const AIRPORT_SIDEBAR_MOBILE_BREAKPOINT =
  AIRPORT_EXPLORER_UI_CONFIG.mobileBreakpointPx;

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function resolveViewportOrientation(width, height) {
  const viewportWidth = toFiniteNumber(width);
  const viewportHeight = toFiniteNumber(height);
  if (viewportWidth <= 0 || viewportHeight <= 0 || viewportWidth === viewportHeight) {
    return "unknown";
  }
  return viewportWidth > viewportHeight ? "landscape" : "portrait";
}

export const getAirportSidebarMode = (
  width,
  clientDeviceProfile?: ClientDeviceProfile | null,
  height?: number,
) => {
  const viewportOrientation = resolveViewportOrientation(width, height);
  return clientDeviceProfile?.isMobileDevice === true &&
    (viewportOrientation === "landscape" ||
      (viewportOrientation === "unknown" &&
        clientDeviceProfile.orientation === "landscape"))
    ? "desktop"
    : Number(width) < AIRPORT_SIDEBAR_MOBILE_BREAKPOINT ? "mobile" : "desktop";
};

export const getAirportSidebarOpenForMode = (mode) => mode === "desktop";
