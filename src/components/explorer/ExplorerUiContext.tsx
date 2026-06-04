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
  MAP_MODE_IDS,
  buildCustomMapSettings,
  buildPresetMapSettings,
  isSelectableMapModeId,
  mapSettingsToExplorerLayers,
  mapSettingsToUserLocationPreferences,
  normalizeMapSettings,
  resolveMapSettingsHydration,
} from "@/features/airport/map-settings/mapSettingsModel";
import {
  readStoredMapSettings,
  writeStoredMapSettings,
} from "@/features/airport/map-settings/mapSettingsStorage";
import { useImmersiveModeFeature } from "@/features/app-shell/auth/useFlightAwareEnabled";
import {
  getAirportSidebarMode,
  getAirportSidebarOpenForMode,
} from "@/utils/sidebarDisplay";

const ExplorerUiContext = createContext(null);
const DEFAULT_MAP_LAYERS = mapSettingsToExplorerLayers(DEFAULT_MAP_SETTINGS);
const DEFAULT_USER_LOCATION_PREFERENCES =
  mapSettingsToUserLocationPreferences(DEFAULT_MAP_SETTINGS);

const initialUiState = {
  ...DEFAULT_AIRPORT_EXPLORER_UI_STATE,
  ...DEFAULT_MAP_LAYERS,
  ...DEFAULT_USER_LOCATION_PREFERENCES,
  mapSettings: DEFAULT_MAP_SETTINGS,
  sidebarMode: "desktop",
  sidebarOpen: true,
  selectedAircraftId: "",
  selectedAirportIcao: "",
  selectedNavaidKey: "",
  selectedAirspaceId: "",
  selectedCandidateWatchingSpotId: "",
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

function applyMapSettingsToUiState(state, settings, options = {}) {
  const normalizedSettings = normalizeMapSettings(settings, options);
  const layers = mapSettingsToExplorerLayers(normalizedSettings, options);
  const userLocationPreferences =
    mapSettingsToUserLocationPreferences(normalizedSettings, options);
  return {
    ...state,
    ...layers,
    ...userLocationPreferences,
    mapSettings: normalizedSettings,
    selectedAirspaceId: layers.showAirspaces ? state.selectedAirspaceId : "",
    selectedCandidateWatchingSpotId: layers.showCandidateWatchingSpots
      ? state.selectedCandidateWatchingSpotId
      : "",
  };
}

function applyManualLayerToggle(state, layerKey, value, options = {}) {
  return applyMapSettingsToUiState(
    state,
    buildCustomMapSettings({
      settings: state.mapSettings,
      layerKey,
      value,
      ...options,
    }),
    options,
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
        { immersiveModeEnabled: action.immersiveModeEnabled },
      );
    case "toggleRunwayBeams":
      return applyManualLayerToggle(
        state,
        MAP_LAYER_KEYS.APPROACH_BEAMS,
        toggleValue(state.showRunwayBeams),
        { immersiveModeEnabled: action.immersiveModeEnabled },
      );
    case "toggleNavaidMarkers":
      return applyManualLayerToggle(
        state,
        MAP_LAYER_KEYS.NAVAID_MARKERS,
        toggleValue(state.showNavaidMarkers),
        { immersiveModeEnabled: action.immersiveModeEnabled },
      );
    case "toggleAirspaces":
      return applyManualLayerToggle(
        state,
        MAP_LAYER_KEYS.AIRSPACES,
        toggleValue(state.showAirspaces),
        { immersiveModeEnabled: action.immersiveModeEnabled },
      );
    case "toggleCandidateWatchingSpots":
      return applyManualLayerToggle(
        state,
        MAP_LAYER_KEYS.CANDIDATE_WATCHING_SPOTS,
        toggleValue(state.showCandidateWatchingSpots),
        { immersiveModeEnabled: action.immersiveModeEnabled },
      );
    case "applyMapMode":
      if (
        !isSelectableMapModeId(action.modeId, {
          immersiveModeEnabled: action.immersiveModeEnabled,
        })
      ) {
        return state;
      }
      return applyMapSettingsToUiState(
        state,
        buildPresetMapSettings({
          modeId: action.modeId,
          audioEnabled: state.mapSettings?.audioEnabled,
          immersiveModeEnabled: action.immersiveModeEnabled,
        }),
        { immersiveModeEnabled: action.immersiveModeEnabled },
      );
    case "hydrateMapSettings":
      return applyMapSettingsToUiState(state, action.settings, {
        immersiveModeEnabled: action.immersiveModeEnabled,
      });
    case "setUserLocationPreferences": {
      const userLocationEnabled = action.userLocationEnabled === true;
      const userLocationAudioEnabled =
        userLocationEnabled && action.userLocationAudioEnabled === true;
      const locationSettings = buildCustomMapSettings({
        settings: state.mapSettings,
        layerKey: MAP_LAYER_KEYS.USER_LOCATION,
        value: userLocationEnabled,
        immersiveModeEnabled: action.immersiveModeEnabled,
      });
      return applyMapSettingsToUiState(
        state,
        buildCustomMapSettings({
          settings: locationSettings,
          layerKey: MAP_LAYER_KEYS.USER_LOCATION_AUDIO,
          value: userLocationAudioEnabled,
          immersiveModeEnabled: action.immersiveModeEnabled,
        }),
        { immersiveModeEnabled: action.immersiveModeEnabled },
      );
    }
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
        selectedCandidateWatchingSpotId: "",
      };
    case "setSelectedAircraftId":
      return {
        ...state,
        selectedAircraftId: action.aircraftId,
        selectedAirportIcao: "",
        selectedNavaidKey: "",
        selectedAirspaceId: "",
        selectedCandidateWatchingSpotId: "",
      };
    case "selectAirport":
      return {
        ...state,
        selectedAirportIcao:
          state.selectedAirportIcao === action.icao ? "" : action.icao,
        selectedAircraftId: "",
        selectedNavaidKey: "",
        selectedAirspaceId: "",
        selectedCandidateWatchingSpotId: "",
      };
    case "selectNavaid":
      return {
        ...state,
        selectedNavaidKey:
          state.selectedNavaidKey === action.navaidKey ? "" : action.navaidKey,
        selectedAircraftId: "",
        selectedAirportIcao: "",
        selectedAirspaceId: "",
        selectedCandidateWatchingSpotId: "",
      };
    case "setSelectedNavaidKey":
      return {
        ...state,
        selectedNavaidKey: action.navaidKey,
        selectedAircraftId: "",
        selectedAirportIcao: "",
        selectedAirspaceId: "",
        selectedCandidateWatchingSpotId: "",
      };
    case "selectAirspace":
      return {
        ...state,
        selectedAirspaceId:
          state.selectedAirspaceId === action.airspaceId ? "" : action.airspaceId,
        selectedAircraftId: "",
        selectedAirportIcao: "",
        selectedNavaidKey: "",
        selectedCandidateWatchingSpotId: "",
      };
    case "setSelectedAirspaceId":
      return {
        ...state,
        selectedAirspaceId: action.airspaceId,
        selectedAircraftId: "",
        selectedAirportIcao: "",
        selectedNavaidKey: "",
        selectedCandidateWatchingSpotId: "",
      };
    case "selectCandidateWatchingSpot":
      return {
        ...state,
        selectedCandidateWatchingSpotId:
          state.selectedCandidateWatchingSpotId === action.spotId
            ? ""
            : action.spotId,
        selectedAircraftId: "",
        selectedAirportIcao: "",
        selectedNavaidKey: "",
        selectedAirspaceId: "",
      };
    case "setSelectedCandidateWatchingSpotId":
      return {
        ...state,
        selectedCandidateWatchingSpotId: action.spotId,
        selectedAircraftId: "",
        selectedAirportIcao: "",
        selectedNavaidKey: "",
        selectedAirspaceId: "",
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
  const immersiveModeFeature = useImmersiveModeFeature();
  const immersiveModeEnabled = immersiveModeFeature.enabled;
  const hasHydratedMapSettingsRef = useRef(false);
  const persistedMapSettingsRef = useRef("");
  const [mapSettingsSaveStatus, setMapSettingsSaveStatus] = useState("idle");
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
    showCandidateWatchingSpots,
    userLocationEnabled,
    userLocationAudioEnabled,
    mapSettings,
    trafficFilter,
    typeFilter,
    altitudeLevel,
    entityFilter,
    selectedAircraftId,
    selectedAirportIcao,
    selectedNavaidKey,
    selectedAirspaceId,
    selectedCandidateWatchingSpotId,
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
    if (!isLoaded || !immersiveModeFeature.resolved) return undefined;
    let cancelled = false;
    const options = { immersiveModeEnabled };

    const hydrateMapSettings = async () => {
      hasHydratedMapSettingsRef.current = false;
      setMapSettingsSaveStatus("idle");
      const cachedSettings = readStoredMapSettings(options);
      let userSettings = null;

      if (isSignedIn) {
        try {
          const response = await fetch("/api/map-settings", {
            cache: "no-store",
          });
          if (response.ok) {
            const payload = await response.json();
            userSettings = payload?.settings
              ? normalizeMapSettings(payload.settings, options)
              : null;
          }
        } catch {
          userSettings = null;
        }
      }

      if (cancelled) return;
      const hydratedSettings = resolveMapSettingsHydration({
        signedIn: isSignedIn,
        userSettings,
        cachedSettings,
        immersiveModeEnabled,
      });
      if (hydratedSettings.settings) {
        dispatch({
          type: "hydrateMapSettings",
          settings: hydratedSettings.settings,
          immersiveModeEnabled,
        });
      }

      const effectiveSettings = hydratedSettings.settings
        ? hydratedSettings.settings
        : normalizeMapSettings(DEFAULT_MAP_SETTINGS, options);
      if (isSignedIn && hydratedSettings.source === "cache") {
        persistedMapSettingsRef.current = "";
      } else {
        persistedMapSettingsRef.current = JSON.stringify(effectiveSettings);
      }
      hasHydratedMapSettingsRef.current = true;
    };

    hydrateMapSettings();

    return () => {
      cancelled = true;
    };
  }, [
    immersiveModeEnabled,
    immersiveModeFeature.resolved,
    isLoaded,
    isSignedIn,
  ]);

  useEffect(() => {
    if (
      !isLoaded ||
      !immersiveModeFeature.resolved ||
      !hasHydratedMapSettingsRef.current
    ) {
      return undefined;
    }
    const nextSettings = normalizeMapSettings(mapSettings, {
      immersiveModeEnabled,
    });
    const serialized = JSON.stringify(nextSettings);
    if (serialized === persistedMapSettingsRef.current) return undefined;

    if (!isSignedIn) {
      writeStoredMapSettings(nextSettings, { immersiveModeEnabled });
      persistedMapSettingsRef.current = serialized;
      return undefined;
    }

    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setMapSettingsSaveStatus("saving");
      try {
        const response = await fetch("/api/map-settings", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ settings: nextSettings }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("save failed");
        const payload = await response.json();
        const savedSettings = payload?.settings
          ? normalizeMapSettings(payload.settings, { immersiveModeEnabled })
          : nextSettings;
        const savedSerialized = JSON.stringify(savedSettings);
        if (cancelled) return;
        persistedMapSettingsRef.current = savedSerialized;
        if (savedSerialized !== serialized) {
          dispatch({
            type: "hydrateMapSettings",
            settings: savedSettings,
            immersiveModeEnabled,
          });
        }
        setMapSettingsSaveStatus("saved");
      } catch (error: any) {
        if (cancelled || error?.name === "AbortError") return;
        setMapSettingsSaveStatus("error");
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    immersiveModeEnabled,
    immersiveModeFeature.resolved,
    isLoaded,
    isSignedIn,
    mapSettings,
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
    dispatch({ type: "toggleMapLabels", immersiveModeEnabled });
  }, [immersiveModeEnabled]);

  const toggleRunwayBeams = useCallback(() => {
    dispatch({ type: "toggleRunwayBeams", immersiveModeEnabled });
  }, [immersiveModeEnabled]);

  const toggleNavaidMarkers = useCallback(() => {
    dispatch({ type: "toggleNavaidMarkers", immersiveModeEnabled });
  }, [immersiveModeEnabled]);

  const toggleAirspaces = useCallback(() => {
    dispatch({ type: "toggleAirspaces", immersiveModeEnabled });
  }, [immersiveModeEnabled]);

  const toggleCandidateWatchingSpots = useCallback(() => {
    dispatch({
      type: "toggleCandidateWatchingSpots",
      immersiveModeEnabled,
    });
  }, [immersiveModeEnabled]);

  const applyMapMode = useCallback((modeId) => {
    dispatch({ type: "applyMapMode", modeId, immersiveModeEnabled });
  }, [immersiveModeEnabled]);

  const setUserLocationPreferences = useCallback(
    ({ userLocationEnabled, userLocationAudioEnabled = false }) => {
      dispatch({
        type: "setUserLocationPreferences",
        userLocationEnabled,
        userLocationAudioEnabled,
        immersiveModeEnabled,
      });
    },
    [immersiveModeEnabled],
  );

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

  const selectCandidateWatchingSpot = useCallback((spotId) => {
    dispatch({ type: "selectCandidateWatchingSpot", spotId });
  }, []);

  const setSelectedCandidateWatchingSpotId = useCallback((spotId) => {
    dispatch({ type: "setSelectedCandidateWatchingSpotId", spotId });
  }, []);

  const fitToTrace = useCallback(() => {
    dispatch({ type: "fitToTrace" });
  }, []);

  const suspendMapFollow = useCallback(() => {
    dispatch({ type: "suspendMapFollow" });
  }, []);

  const fitToTraceSignal = state.fitToTraceSignal;
  const mapFollowsAircraft = state.mapFollowsAircraft;
  const immersiveModeActive =
    mapSettings?.selectedMode === MAP_MODE_IDS.IMMERSIVE &&
    immersiveModeEnabled;

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
      showCandidateWatchingSpots,
      userLocationEnabled,
      userLocationAudioEnabled,
      mapSettings,
      mapSettingsSaveStatus,
      immersiveModeActive,
      immersiveModeEnabled,
      trafficFilter,
      typeFilter,
      altitudeLevel,
      entityFilter,
      selectedAircraftId,
      selectedAirportIcao,
      selectedNavaidKey,
      selectedAirspaceId,
      selectedCandidateWatchingSpotId,
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
      toggleCandidateWatchingSpots,
      applyMapMode,
      setUserLocationPreferences,
      selectAircraft,
      setSelectedAircraftId,
      selectAirport,
      selectNavaid,
      setSelectedNavaidKey,
      selectAirspace,
      setSelectedAirspaceId,
      selectCandidateWatchingSpot,
      setSelectedCandidateWatchingSpotId,
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
      showCandidateWatchingSpots,
      userLocationEnabled,
      userLocationAudioEnabled,
      mapSettings,
      mapSettingsSaveStatus,
      immersiveModeActive,
      immersiveModeEnabled,
      trafficFilter,
      typeFilter,
      altitudeLevel,
      entityFilter,
      selectedAircraftId,
      selectedAirportIcao,
      selectedNavaidKey,
      selectedAirspaceId,
      selectedCandidateWatchingSpotId,
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
      toggleCandidateWatchingSpots,
      applyMapMode,
      setUserLocationPreferences,
      selectAircraft,
      setSelectedAircraftId,
      selectAirport,
      selectNavaid,
      setSelectedNavaidKey,
      selectAirspace,
      setSelectedAirspaceId,
      selectCandidateWatchingSpot,
      setSelectedCandidateWatchingSpotId,
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
