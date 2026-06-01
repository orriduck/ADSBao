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
const LAYER_STORAGE_KEY = "adsbao:airport-map-layers:v1";
const LAYER_STORAGE_FIELDS = [
  "showMapLabels",
  "showRunwayBeams",
  "showNavaidMarkers",
  "showAirspaces",
];

const initialUiState = {
  ...DEFAULT_AIRPORT_EXPLORER_UI_STATE,
  sidebarMode: "desktop",
  sidebarOpen: true,
  selectedAircraftId: "",
  selectedAirportIcao: "",
  selectedNavaidKey: "",
  selectedAirspaceId: "",
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
    case "toggleAirspaces": {
      const showAirspaces = toggleValue(state.showAirspaces);
      return {
        ...state,
        showAirspaces,
        selectedAirspaceId: showAirspaces ? state.selectedAirspaceId : "",
      };
    }
    case "hydrateLayerPreferences":
      return {
        ...state,
        ...action.layers,
        selectedAirspaceId: action.layers.showAirspaces === false ? "" : state.selectedAirspaceId,
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
        selectedAirspaceId: "",
      };
    case "setSelectedAircraftId":
      return {
        ...state,
        selectedAircraftId: action.aircraftId,
        selectedAirportIcao: "",
        selectedNavaidKey: "",
        selectedAirspaceId: "",
      };
    case "selectAirport":
      return {
        ...state,
        selectedAirportIcao:
          state.selectedAirportIcao === action.icao ? "" : action.icao,
        selectedAircraftId: "",
        selectedNavaidKey: "",
        selectedAirspaceId: "",
      };
    case "selectNavaid":
      return {
        ...state,
        selectedNavaidKey:
          state.selectedNavaidKey === action.navaidKey ? "" : action.navaidKey,
        selectedAircraftId: "",
        selectedAirportIcao: "",
        selectedAirspaceId: "",
      };
    case "setSelectedNavaidKey":
      return {
        ...state,
        selectedNavaidKey: action.navaidKey,
        selectedAircraftId: "",
        selectedAirportIcao: "",
        selectedAirspaceId: "",
      };
    case "selectAirspace":
      return {
        ...state,
        selectedAirspaceId:
          state.selectedAirspaceId === action.airspaceId ? "" : action.airspaceId,
        selectedAircraftId: "",
        selectedAirportIcao: "",
        selectedNavaidKey: "",
      };
    case "setSelectedAirspaceId":
      return {
        ...state,
        selectedAirspaceId: action.airspaceId,
        selectedAircraftId: "",
        selectedAirportIcao: "",
        selectedNavaidKey: "",
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
    showAirspaces,
    trafficFilter,
    typeFilter,
    altitudeLevel,
    entityFilter,
    selectedAircraftId,
    selectedAirportIcao,
    selectedNavaidKey,
    selectedAirspaceId,
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

  useEffect(() => {
    const storedLayers = readStoredLayerPreferences();
    if (storedLayers) {
      dispatch({ type: "hydrateLayerPreferences", layers: storedLayers });
    }
  }, []);

  useEffect(() => {
    writeStoredLayerPreferences({
      showMapLabels,
      showRunwayBeams,
      showNavaidMarkers,
      showAirspaces,
    });
  }, [
    showMapLabels,
    showRunwayBeams,
    showNavaidMarkers,
    showAirspaces,
  ]);

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

  const toggleAirspaces = useCallback(() => {
    dispatch({ type: "toggleAirspaces" });
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

  const selectAirspace = useCallback((airspaceId) => {
    dispatch({ type: "selectAirspace", airspaceId });
  }, []);

  const setSelectedAirspaceId = useCallback((airspaceId) => {
    dispatch({ type: "setSelectedAirspaceId", airspaceId });
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
      showAirspaces,
      trafficFilter,
      typeFilter,
      altitudeLevel,
      entityFilter,
      selectedAircraftId,
      selectedAirportIcao,
      selectedNavaidKey,
      selectedAirspaceId,
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
      toggleAirspaces,
      selectAircraft,
      setSelectedAircraftId,
      selectAirport,
      selectNavaid,
      setSelectedNavaidKey,
      selectAirspace,
      setSelectedAirspaceId,
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
      showAirspaces,
      trafficFilter,
      typeFilter,
      altitudeLevel,
      entityFilter,
      selectedAircraftId,
      selectedAirportIcao,
      selectedNavaidKey,
      selectedAirspaceId,
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
      toggleAirspaces,
      selectAircraft,
      setSelectedAircraftId,
      selectAirport,
      selectNavaid,
      setSelectedNavaidKey,
      selectAirspace,
      setSelectedAirspaceId,
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

function readStoredLayerPreferences() {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LAYER_STORAGE_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return null;
    return LAYER_STORAGE_FIELDS.reduce((layers, field) => {
      if (typeof parsed[field] === "boolean") layers[field] = parsed[field];
      return layers;
    }, {});
  } catch {
    return null;
  }
}

function writeStoredLayerPreferences(layers) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAYER_STORAGE_KEY, JSON.stringify(layers));
  } catch {
    // Local storage can be unavailable in private contexts; layer toggles
    // still work for the current session.
  }
}
