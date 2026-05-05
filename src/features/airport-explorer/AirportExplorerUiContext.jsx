"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AIRPORT_EXPLORER_UI_CONFIG } from "@/config/aviation.js";
import { ZOOM_APPROACH } from "@/utils/airportMapDisplay.js";
import {
  getAirportSidebarMode,
  getAirportSidebarOpenForMode,
} from "@/utils/sidebarDisplay.js";

const AirportExplorerUiContext = createContext(null);

export function AirportExplorerUiProvider({ children }) {
  const previousSidebarMode = useRef(null);
  const [sidebarMode, setSidebarMode] = useState("desktop");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mapZoom, setMapZoom] = useState(ZOOM_APPROACH);
  const [showMapLabels, setShowMapLabels] = useState(true);
  const [showTelemetry, setShowTelemetry] = useState(true);
  const isMobile = sidebarMode === "mobile";

  useEffect(() => {
    const syncSidebarMode = () => {
      setSidebarMode(getAirportSidebarMode(window.innerWidth));
    };

    syncSidebarMode();
    window.addEventListener("resize", syncSidebarMode);

    return () => window.removeEventListener("resize", syncSidebarMode);
  }, []);

  useEffect(() => {
    if (!sidebarMode || previousSidebarMode.current === sidebarMode) return;

    previousSidebarMode.current = sidebarMode;
    setSidebarOpen(getAirportSidebarOpenForMode(sidebarMode));
  }, [sidebarMode]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((value) => !value);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const toggleMapLabels = useCallback(() => {
    setShowMapLabels((value) => !value);
  }, []);

  const toggleTelemetry = useCallback(() => {
    setShowTelemetry((value) => !value);
  }, []);

  const value = useMemo(
    () => ({
      desktopSidebarWidth: AIRPORT_EXPLORER_UI_CONFIG.desktopSidebarWidth,
      sidebarMode,
      sidebarOpen,
      isMobile,
      mapZoom,
      showMapLabels,
      showTelemetry,
      setMapZoom,
      toggleSidebar,
      closeSidebar,
      toggleMapLabels,
      toggleTelemetry,
    }),
    [
      sidebarMode,
      sidebarOpen,
      isMobile,
      mapZoom,
      showMapLabels,
      showTelemetry,
      toggleSidebar,
      closeSidebar,
      toggleMapLabels,
      toggleTelemetry,
    ],
  );

  return (
    <AirportExplorerUiContext.Provider value={value}>
      {children}
    </AirportExplorerUiContext.Provider>
  );
}

export function useAirportExplorerUi() {
  const context = useContext(AirportExplorerUiContext);
  if (!context) {
    throw new Error(
      "useAirportExplorerUi must be used within AirportExplorerUiProvider",
    );
  }
  return context;
}
