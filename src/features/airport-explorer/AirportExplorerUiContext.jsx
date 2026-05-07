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
import { DEFAULT_ALTITUDE_FOCUS } from "@/features/airport-context/airportContextUiModel.js";
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
  const [showMapLabels, setShowMapLabels] = useState(false);
  const [showTelemetry, setShowTelemetry] = useState(true);
  const [showRunwayBeams, setShowRunwayBeams] = useState(true);
  const [showRoutingPointBadges, setShowRoutingPointBadges] = useState(true);
  const [showAirspaceContext, setShowAirspaceContext] = useState(true);
  const [altitudeFocus, setAltitudeFocus] = useState(DEFAULT_ALTITUDE_FOCUS);
  const [selectedAircraftId, setSelectedAircraftId] = useState("");
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

  const toggleRunwayBeams = useCallback(() => {
    setShowRunwayBeams((value) => !value);
  }, []);

  const toggleRoutingPointBadges = useCallback(() => {
    setShowRoutingPointBadges((value) => !value);
  }, []);

  const toggleAirspaceContext = useCallback(() => {
    setShowAirspaceContext((value) => !value);
  }, []);

  const selectAircraft = useCallback((aircraftId) => {
    setSelectedAircraftId((currentId) =>
      currentId === aircraftId ? "" : aircraftId,
    );
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
      showRunwayBeams,
      showRoutingPointBadges,
      showAirspaceContext,
      altitudeFocus,
      selectedAircraftId,
      setMapZoom,
      setAltitudeFocus,
      toggleSidebar,
      closeSidebar,
      toggleMapLabels,
      toggleTelemetry,
      toggleRunwayBeams,
      toggleRoutingPointBadges,
      toggleAirspaceContext,
      selectAircraft,
      setSelectedAircraftId,
    }),
    [
      sidebarMode,
      sidebarOpen,
      isMobile,
      mapZoom,
      showMapLabels,
      showTelemetry,
      showRunwayBeams,
      showRoutingPointBadges,
      showAirspaceContext,
      altitudeFocus,
      selectedAircraftId,
      toggleSidebar,
      closeSidebar,
      toggleMapLabels,
      toggleTelemetry,
      toggleRunwayBeams,
      toggleRoutingPointBadges,
      toggleAirspaceContext,
      selectAircraft,
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
