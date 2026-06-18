import { AIRPORT_EXPLORER_UI_CONFIG } from "../config/aviation";
import type { ClientDeviceProfile } from "@/features/app-shell/device/clientDeviceModel";

const AIRPORT_SIDEBAR_MOBILE_BREAKPOINT =
  AIRPORT_EXPLORER_UI_CONFIG.mobileBreakpointPx;

export const getAirportSidebarMode = (
  width,
  clientDeviceProfile?: ClientDeviceProfile | null,
) =>
  clientDeviceProfile?.isMobileDevice &&
  clientDeviceProfile.orientation === "landscape"
    ? "desktop"
    : Number(width) < AIRPORT_SIDEBAR_MOBILE_BREAKPOINT ? "mobile" : "desktop";

export const getAirportSidebarOpenForMode = (mode) => mode === "desktop";
