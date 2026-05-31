"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import { AIRPORT_EXPLORER_UI_CONFIG } from "@/config/aviation";
import { DEFAULT_AIRPORT_EXPLORER_UI_STATE } from "@/features/airport/explorer/airportExplorerUiModel";
import {
  getAirportSidebarMode,
  getAirportSidebarOpenForMode,
} from "@/utils/sidebarDisplay";

const ExplorerUiContext = createContext(null);

const initialUiState = {
  ...DEFAULT_AIRPORT_EXPLORER_UI_STATE,
  sidebarMode: "desktop",
  sidebarOpen: true,
  selectedAircraftId: "",
  selectedAirportIcao: "",
  selectedNavaidKey: "",
  // Monotonic counter. Incremented by the UI when the user wants the map
  // to fit its viewport to the currently-rendered aircraft trace; a
  // child of AirportMap listens for changes and runs fitBounds against
  // the trace points.
  fitToTraceSignal: 0,
  // When true (default), the map re-centers on every aircraft position
  // poll. The user opts out by clicking "fit to trace" — the map then
  // stays anchored on the trace bounds. Clicking any preset zoom
  // re-enables auto-follow.
  mapFollowsAircraft: true,
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
      // Any user-initiated zoom cycle re-engages auto-follow — the user
      // is asking for one of the named perspectives again, so the map
      // should resume tracking the focal aircraft from that zoom.
      return {
        ...state,
        mapZoom: action.mapZoom,
        mapFollowsAircraft: true,
      };
    case "toggleMapLabels":
      return { ...state, showMapLabels: toggleValue(state.showMapLabels) };
    case "toggleRunwayBeams":
      return { ...state, showRunwayBeams: toggleValue(state.showRunwayBeams) };
    case "toggleNavaidMarkers":
      return {
        ...state,
        showNavaidMarkers: toggleValue(state.showNavaidMarkers),
      };
    case "setTrafficFilter":
      return { ...state, trafficFilter: action.trafficFilter };
    case "setTypeFilter":
      return { ...state, typeFilter: action.typeFilter };
    case "setAltitudeLevel":
      return { ...state, altitudeLevel: action.altitudeLevel };
    case "setEntityFilter":
      return { ...state, entityFilter: action.entityFilter };
    case "selectAircraft":
      return {
        ...state,
        selectedAircraftId:
          state.selectedAircraftId === action.aircraftId
            ? ""
            : action.aircraftId,
        // Selecting an aircraft clears any airport selection so only one
        // preview card is up at a time.
        selectedAirportIcao: "",
        selectedNavaidKey: "",
      };
    case "setSelectedAircraftId":
      return {
        ...state,
        selectedAircraftId: action.aircraftId,
        selectedAirportIcao: "",
        selectedNavaidKey: "",
      };
    case "selectAirport":
      return {
        ...state,
        selectedAirportIcao:
          state.selectedAirportIcao === action.icao ? "" : action.icao,
        selectedAircraftId: "",
        selectedNavaidKey: "",
      };
    case "selectNavaid":
      return {
        ...state,
        selectedNavaidKey:
          state.selectedNavaidKey === action.navaidKey ? "" : action.navaidKey,
        selectedAircraftId: "",
        selectedAirportIcao: "",
      };
    case "setSelectedNavaidKey":
      return {
        ...state,
        selectedNavaidKey: action.navaidKey,
        selectedAircraftId: "",
        selectedAirportIcao: "",
      };
    case "fitToTrace":
      return {
        ...state,
        fitToTraceSignal: state.fitToTraceSignal + 1,
        mapFollowsAircraft: false,
      };
    case "suspendMapFollow":
      if (!state.mapFollowsAircraft) return state;
      return {
        ...state,
        mapFollowsAircraft: false,
      };
    default:
      return state;
  }
}

export function ExplorerUiProvider({ children }) {
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
    showNavaidMarkers,
    trafficFilter,
    typeFilter,
    altitudeLevel,
    entityFilter,
    selectedAircraftId,
    selectedAirportIcao,
    selectedNavaidKey,
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

  const toggleNavaidMarkers = useCallback(() => {
    dispatch({ type: "toggleNavaidMarkers" });
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

  const setEntityFilter = useCallback((entityFilter) => {
    dispatch({ type: "setEntityFilter", entityFilter });
  }, []);

  const selectAircraft = useCallback((aircraftId) => {
    dispatch({ type: "selectAircraft", aircraftId });
  }, []);

  const setSelectedAircraftId = useCallback((aircraftId) => {
    dispatch({ type: "setSelectedAircraftId", aircraftId });
  }, []);

  const selectAirport = useCallback((icao) => {
    dispatch({ type: "selectAirport", icao });
  }, []);

  const selectNavaid = useCallback((navaidKey) => {
    dispatch({ type: "selectNavaid", navaidKey });
  }, []);

  const setSelectedNavaidKey = useCallback((navaidKey) => {
    dispatch({ type: "setSelectedNavaidKey", navaidKey });
  }, []);

  const fitToTrace = useCallback(() => {
    dispatch({ type: "fitToTrace" });
  }, []);

  const suspendMapFollow = useCallback(() => {
    dispatch({ type: "suspendMapFollow" });
  }, []);

  const fitToTraceSignal = state.fitToTraceSignal;
  const mapFollowsAircraft = state.mapFollowsAircraft;

  const value = useMemo(
    () => ({
      desktopSidebarWidth: AIRPORT_EXPLORER_UI_CONFIG.desktopSidebarWidth,
      sidebarMode,
      sidebarOpen,
      isMobile,
      mapZoom,
      mapFollowsAircraft,
      showMapLabels,
      showRunwayBeams,
      showNavaidMarkers,
      trafficFilter,
      typeFilter,
      altitudeLevel,
      entityFilter,
      selectedAircraftId,
      selectedAirportIcao,
      selectedNavaidKey,
      fitToTraceSignal,
      setMapZoom,
      setTrafficFilter,
      setTypeFilter,
      setAltitudeLevel,
      setEntityFilter,
      toggleSidebar,
      closeSidebar,
      toggleMapLabels,
      toggleRunwayBeams,
      toggleNavaidMarkers,
      selectAircraft,
      setSelectedAircraftId,
      selectAirport,
      selectNavaid,
      setSelectedNavaidKey,
      fitToTrace,
      suspendMapFollow,
    }),
    [
      sidebarMode,
      sidebarOpen,
      isMobile,
      mapZoom,
      mapFollowsAircraft,
      showMapLabels,
      showRunwayBeams,
      showNavaidMarkers,
      trafficFilter,
      typeFilter,
      altitudeLevel,
      entityFilter,
      selectedAircraftId,
      selectedAirportIcao,
      selectedNavaidKey,
      fitToTraceSignal,
      setMapZoom,
      setTrafficFilter,
      setTypeFilter,
      setAltitudeLevel,
      setEntityFilter,
      toggleSidebar,
      closeSidebar,
      toggleMapLabels,
      toggleRunwayBeams,
      toggleNavaidMarkers,
      selectAircraft,
      setSelectedAircraftId,
      selectAirport,
      selectNavaid,
      setSelectedNavaidKey,
      fitToTrace,
      suspendMapFollow,
    ],
  );

  return (
    <ExplorerUiContext.Provider value={value}>
      {children}
    </ExplorerUiContext.Provider>
  );
}

export function useExplorerUi() {
  const context = useContext(ExplorerUiContext);
  if (!context) {
    throw new Error(
      "useExplorerUi must be used within ExplorerUiProvider",
    );
  }
  return context;
}
