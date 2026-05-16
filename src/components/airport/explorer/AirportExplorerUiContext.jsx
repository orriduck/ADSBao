"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import { AIRPORT_EXPLORER_UI_CONFIG } from "@/config/aviation.js";
import { DEFAULT_AIRPORT_EXPLORER_UI_STATE } from "@/features/airport/explorer/airportExplorerUiModel.js";
import {
  getAirportSidebarMode,
  getAirportSidebarOpenForMode,
} from "@/utils/sidebarDisplay.js";

const AirportExplorerUiContext = createContext(null);

const initialUiState = {
  ...DEFAULT_AIRPORT_EXPLORER_UI_STATE,
  sidebarMode: "desktop",
  sidebarOpen: true,
  selectedAircraftId: "",
};

function toggleValue(value) {
  return !value;
}

function airportExplorerUiReducer(state, action) {
  switch (action.type) {
    case "setSidebarMode": {
      if (state.sidebarMode === action.sidebarMode) return state;

      return {
        ...state,
        sidebarMode: action.sidebarMode,
        sidebarOpen: getAirportSidebarOpenForMode(action.sidebarMode),
      };
    }
    case "toggleSidebar":
      return { ...state, sidebarOpen: toggleValue(state.sidebarOpen) };
    case "closeSidebar":
      return { ...state, sidebarOpen: false };
    case "setMapZoom":
      return { ...state, mapZoom: action.mapZoom };
    case "toggleMapLabels":
      return { ...state, showMapLabels: toggleValue(state.showMapLabels) };
    case "toggleRunwayBeams":
      return { ...state, showRunwayBeams: toggleValue(state.showRunwayBeams) };
    case "toggleRoutingPointBadges":
      return {
        ...state,
        showRoutingPointBadges: toggleValue(state.showRoutingPointBadges),
      };
    case "setTrafficFilter":
      return { ...state, trafficFilter: action.trafficFilter };
    case "setTypeFilter":
      return { ...state, typeFilter: action.typeFilter };
    case "setAltitudeLevel":
      return { ...state, altitudeLevel: action.altitudeLevel };
    case "selectAircraft":
      return {
        ...state,
        selectedAircraftId:
          state.selectedAircraftId === action.aircraftId
            ? ""
            : action.aircraftId,
      };
    case "setSelectedAircraftId":
      return { ...state, selectedAircraftId: action.aircraftId };
    default:
      return state;
  }
}

export function AirportExplorerUiProvider({ children }) {
  const [state, dispatch] = useReducer(
    airportExplorerUiReducer,
    initialUiState,
  );
  const {
    sidebarMode,
    sidebarOpen,
    mapZoom,
    showMapLabels,
    showRunwayBeams,
    showRoutingPointBadges,
    trafficFilter,
    typeFilter,
    altitudeLevel,
    selectedAircraftId,
  } = state;
  const isMobile = sidebarMode === "mobile";

  useEffect(() => {
    const syncSidebarMode = () => {
      dispatch({
        type: "setSidebarMode",
        sidebarMode: getAirportSidebarMode(window.innerWidth),
      });
    };

    syncSidebarMode();
    window.addEventListener("resize", syncSidebarMode);

    return () => window.removeEventListener("resize", syncSidebarMode);
  }, []);

  const toggleSidebar = useCallback(() => {
    dispatch({ type: "toggleSidebar" });
  }, []);

  const closeSidebar = useCallback(() => {
    dispatch({ type: "closeSidebar" });
  }, []);

  const setMapZoom = useCallback((mapZoom) => {
    dispatch({ type: "setMapZoom", mapZoom });
  }, []);

  const toggleMapLabels = useCallback(() => {
    dispatch({ type: "toggleMapLabels" });
  }, []);

  const toggleRunwayBeams = useCallback(() => {
    dispatch({ type: "toggleRunwayBeams" });
  }, []);

  const toggleRoutingPointBadges = useCallback(() => {
    dispatch({ type: "toggleRoutingPointBadges" });
  }, []);

  const setTrafficFilter = useCallback((trafficFilter) => {
    dispatch({ type: "setTrafficFilter", trafficFilter });
  }, []);

  const setTypeFilter = useCallback((typeFilter) => {
    dispatch({ type: "setTypeFilter", typeFilter });
  }, []);

  const setAltitudeLevel = useCallback((altitudeLevel) => {
    dispatch({ type: "setAltitudeLevel", altitudeLevel });
  }, []);

  const selectAircraft = useCallback((aircraftId) => {
    dispatch({ type: "selectAircraft", aircraftId });
  }, []);

  const setSelectedAircraftId = useCallback((aircraftId) => {
    dispatch({ type: "setSelectedAircraftId", aircraftId });
  }, []);

  const value = useMemo(
    () => ({
      desktopSidebarWidth: AIRPORT_EXPLORER_UI_CONFIG.desktopSidebarWidth,
      sidebarMode,
      sidebarOpen,
      isMobile,
      mapZoom,
      showMapLabels,
      showRunwayBeams,
      showRoutingPointBadges,
      trafficFilter,
      typeFilter,
      altitudeLevel,
      selectedAircraftId,
      setMapZoom,
      setTrafficFilter,
      setTypeFilter,
      setAltitudeLevel,
      toggleSidebar,
      closeSidebar,
      toggleMapLabels,
      toggleRunwayBeams,
      toggleRoutingPointBadges,
      selectAircraft,
      setSelectedAircraftId,
    }),
    [
      sidebarMode,
      sidebarOpen,
      isMobile,
      mapZoom,
      showMapLabels,
      showRunwayBeams,
      showRoutingPointBadges,
      trafficFilter,
      typeFilter,
      altitudeLevel,
      selectedAircraftId,
      setMapZoom,
      setTrafficFilter,
      setTypeFilter,
      setAltitudeLevel,
      toggleSidebar,
      closeSidebar,
      toggleMapLabels,
      toggleRunwayBeams,
      toggleRoutingPointBadges,
      selectAircraft,
      setSelectedAircraftId,
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
