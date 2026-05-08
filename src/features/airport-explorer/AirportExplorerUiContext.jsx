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
import { DEFAULT_AIRPORT_EXPLORER_UI_STATE } from "./airportExplorerUiModel.js";
import {
  getAirportSidebarMode,
  getAirportSidebarOpenForMode,
} from "@/utils/sidebarDisplay.js";

const AirportExplorerUiContext = createContext(null);

export function AirportExplorerUiProvider({ children }) {
  const previousSidebarMode = useRef(null);
  const [sidebarMode, setSidebarMode] = useState("desktop");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mapZoom, setMapZoom] = useState(
    DEFAULT_AIRPORT_EXPLORER_UI_STATE.mapZoom,
  );
  const [showMapLabels, setShowMapLabels] = useState(
    DEFAULT_AIRPORT_EXPLORER_UI_STATE.showMapLabels,
  );
  const [showTelemetry, setShowTelemetry] = useState(
    DEFAULT_AIRPORT_EXPLORER_UI_STATE.showTelemetry,
  );
  const [showRunwayBeams, setShowRunwayBeams] = useState(
    DEFAULT_AIRPORT_EXPLORER_UI_STATE.showRunwayBeams,
  );
  const [showRoutingPointBadges, setShowRoutingPointBadges] = useState(
    DEFAULT_AIRPORT_EXPLORER_UI_STATE.showRoutingPointBadges,
  );
  const [showAirspaceContext, setShowAirspaceContext] = useState(
    DEFAULT_AIRPORT_EXPLORER_UI_STATE.showAirspaceContext,
  );
  const [altitudeFocus, setAltitudeFocus] = useState(
    DEFAULT_AIRPORT_EXPLORER_UI_STATE.altitudeFocus,
  );
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
