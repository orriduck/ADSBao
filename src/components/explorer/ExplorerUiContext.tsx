"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { useUser } from "@clerk/nextjs";
import { AIRPORT_EXPLORER_UI_CONFIG } from "@/config/aviation";
import { DEFAULT_AIRPORT_EXPLORER_UI_STATE } from "@/features/airport/explorer/airportExplorerUiModel";
import {
  DEFAULT_MAP_SETTINGS,
  MAP_LAYER_KEYS,
  buildCustomMapSettings,
  buildMapSettingsFromLayerState,
  buildPresetMapSettings,
  isSelectableMapModeId,
  mapSettingsToExplorerLayers,
  normalizeMapSettings,
} from "@/features/airport/map-settings/mapSettingsModel";
import {
  readStoredMapSettings,
  writeStoredMapSettings,
} from "@/features/airport/map-settings/mapSettingsStorage";
import {
  getAirportSidebarMode,
  getAirportSidebarOpenForMode,
} from "@/utils/sidebarDisplay";

const ExplorerUiContext = createContext(null);
const DEFAULT_MAP_LAYERS = mapSettingsToExplorerLayers(DEFAULT_MAP_SETTINGS);

const initialUiState = {
  ...DEFAULT_AIRPORT_EXPLORER_UI_STATE,
  ...DEFAULT_MAP_LAYERS,
  mapSettings: DEFAULT_MAP_SETTINGS,
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

function applyMapSettingsToUiState(state, settings) {
  const normalizedSettings = normalizeMapSettings(settings);
  const layers = mapSettingsToExplorerLayers(normalizedSettings);
  return {
    ...state,
    ...layers,
    mapSettings: normalizedSettings,
    selectedAirspaceId: layers.showAirspaces ? state.selectedAirspaceId : "",
  };
}

function applyManualLayerToggle(state, layerKey, value) {
  return applyMapSettingsToUiState(
    state,
    buildCustomMapSettings({
      settings: state.mapSettings,
      layerKey,
      value,
    }),
  );
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
      return applyManualLayerToggle(
        state,
        MAP_LAYER_KEYS.MAP_LABELS,
        toggleValue(state.showMapLabels),
      );
    case "toggleRunwayBeams":
      return applyManualLayerToggle(
        state,
        MAP_LAYER_KEYS.APPROACH_BEAMS,
        toggleValue(state.showRunwayBeams),
      );
    case "toggleNavaidMarkers":
      return applyManualLayerToggle(
        state,
        MAP_LAYER_KEYS.NAVAID_MARKERS,
        toggleValue(state.showNavaidMarkers),
      );
    case "toggleAirspaces":
      return applyManualLayerToggle(
        state,
        MAP_LAYER_KEYS.AIRSPACES,
        toggleValue(state.showAirspaces),
      );
    case "applyMapMode":
      if (!isSelectableMapModeId(action.modeId)) return state;
      return applyMapSettingsToUiState(
        state,
        buildPresetMapSettings({
          modeId: action.modeId,
          audioEnabled: state.mapSettings?.audioEnabled,
        }),
      );
    case "hydrateMapSettings":
      return applyMapSettingsToUiState(state, action.settings);
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
  const { isLoaded, isSignedIn } = useUser();
  const hasHydratedMapSettingsRef = useRef(false);
  const persistedMapSettingsRef = useRef("");
  const [savedMapSettings, setSavedMapSettings] = useState<Record<string, any> | null>(null);
  const [mapSettingsSaveStatus, setMapSettingsSaveStatus] = useState("idle");
  const [mapSettingsRestoreStatus, setMapSettingsRestoreStatus] = useState("idle");
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
    mapSettings,
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
    if (!isLoaded) return undefined;
    let cancelled = false;

    const hydrateMapSettings = async () => {
      hasHydratedMapSettingsRef.current = false;
      let nextSettings = null;

      if (isSignedIn) {
        try {
          const response = await fetch("/api/map-settings", {
            cache: "no-store",
          });
          if (response.ok) {
            const payload = await response.json();
            nextSettings = payload?.settings
              ? normalizeMapSettings(payload.settings)
              : null;
          }
        } catch {
          nextSettings = null;
        }
      } else {
        nextSettings = readStoredMapSettings();
      }

      if (cancelled) return;
      if (isSignedIn) {
        setSavedMapSettings(nextSettings);
        persistedMapSettingsRef.current = nextSettings
          ? JSON.stringify(nextSettings)
          : "";
        if (nextSettings) {
          dispatch({ type: "hydrateMapSettings", settings: nextSettings });
        }
      } else if (nextSettings) {
        dispatch({ type: "hydrateMapSettings", settings: nextSettings });
        persistedMapSettingsRef.current = JSON.stringify(nextSettings);
      } else {
        persistedMapSettingsRef.current = "";
      }
      hasHydratedMapSettingsRef.current = true;
    };

    hydrateMapSettings();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (!isLoaded || !hasHydratedMapSettingsRef.current) return undefined;
    if (isSignedIn) return undefined;
    const nextSettings = normalizeMapSettings(mapSettings);
    const serialized = JSON.stringify(nextSettings);
    if (serialized === persistedMapSettingsRef.current) return undefined;

    writeStoredMapSettings(nextSettings);
    persistedMapSettingsRef.current = serialized;
    return undefined;
  }, [isLoaded, isSignedIn, mapSettings]);

  const saveMapSettings = useCallback(async (options: Record<string, any> = {}) => {
    if (!isLoaded || !isSignedIn) return null;
    const nextSettings = normalizeMapSettings(
      options?.layers
        ? buildMapSettingsFromLayerState({
            settings: mapSettings,
            layers: options.layers,
          })
        : mapSettings,
    );
    setMapSettingsSaveStatus("saving");
    try {
      const response = await fetch("/api/map-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ settings: nextSettings }),
      });
      if (!response.ok) throw new Error("save failed");
      const payload = await response.json();
      const savedSettings = payload?.settings
        ? normalizeMapSettings(payload.settings)
        : nextSettings;
      setSavedMapSettings(savedSettings);
      persistedMapSettingsRef.current = JSON.stringify(savedSettings);
      dispatch({ type: "hydrateMapSettings", settings: savedSettings });
      setMapSettingsSaveStatus("saved");
      return savedSettings;
    } catch {
      setMapSettingsSaveStatus("error");
      return null;
    }
  }, [isLoaded, isSignedIn, mapSettings]);

  const restoreMapSettings = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return null;
    setMapSettingsRestoreStatus("restoring");
    try {
      const response = await fetch("/api/map-settings", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("restore failed");
      const payload = await response.json();
      const restoredSettings = payload?.settings
        ? normalizeMapSettings(payload.settings)
        : savedMapSettings;
      if (!restoredSettings) {
        setMapSettingsRestoreStatus("empty");
        return null;
      }
      setSavedMapSettings(restoredSettings);
      persistedMapSettingsRef.current = JSON.stringify(restoredSettings);
      dispatch({ type: "hydrateMapSettings", settings: restoredSettings });
      setMapSettingsRestoreStatus("restored");
      return restoredSettings;
    } catch {
      setMapSettingsRestoreStatus("error");
      return null;
    }
  }, [isLoaded, isSignedIn, savedMapSettings]);

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

  const applyMapMode = useCallback((modeId) => {
    dispatch({ type: "applyMapMode", modeId });
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
      mapSettings,
      savedMapSettings,
      mapSettingsSaveStatus,
      mapSettingsRestoreStatus,
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
      applyMapMode,
      saveMapSettings,
      restoreMapSettings,
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
      mapSettings,
      savedMapSettings,
      mapSettingsSaveStatus,
      mapSettingsRestoreStatus,
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
      applyMapMode,
      saveMapSettings,
      restoreMapSettings,
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
