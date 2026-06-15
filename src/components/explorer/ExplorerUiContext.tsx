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
import { useAuth, useUser } from "@/platform/auth/clerkClient";
import { AIRPORT_EXPLORER_UI_CONFIG } from "@/config/aviation";
import { DEFAULT_AIRPORT_EXPLORER_UI_STATE } from "@/features/airport/explorer/airportExplorerUiModel";
import {
  DEFAULT_MAP_SETTINGS,
  MAP_SETTINGS_DEVICE_TYPES,
  MAP_LAYER_KEYS,
  PRE_HYDRATION_VISUAL_LAYERS,
  buildCustomMapSettings,
  buildMapSettingsWithBaseLayer,
  buildPresetMapSettings,
  isKnownMapBaseLayer,
  isSelectableMapModeId,
  mapSettingsToExplorerLayers,
  mapSettingsToUserLocationPreferences,
  normalizeMapSettings,
  resolveMapSettingsHydrationCommit,
  resolveMapSettingsHydration,
  resolveMapSettingsPersistenceTargets,
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
const DEFAULT_USER_LOCATION_PREFERENCES =
  mapSettingsToUserLocationPreferences(DEFAULT_MAP_SETTINGS);

const mapSettingsDeviceForSidebarMode = (sidebarMode) =>
  sidebarMode === "mobile"
    ? MAP_SETTINGS_DEVICE_TYPES.MOBILE
    : MAP_SETTINGS_DEVICE_TYPES.DESKTOP;

const initialUiState = {
  ...DEFAULT_AIRPORT_EXPLORER_UI_STATE,
  // Pre-hydration visual defaults — map labels and overlays are OFF
  // until saved/cached settings are applied. This prevents the
  // ON→OFF flicker when the user's saved settings (or the mode
  // preset) turn out to differ from the DEFAULT_MAP_SETTINGS
  // Controller preset.
  ...PRE_HYDRATION_VISUAL_LAYERS,
  ...DEFAULT_USER_LOCATION_PREFERENCES,
  mapSettings: DEFAULT_MAP_SETTINGS,
  sidebarMode: "desktop",
  sidebarOpen: true,
  selectedAircraftId: "",
  selectedAirportIcao: "",
  selectedNavaidKey: "",
  selectedAirspaceId: "",
  selectedCandidateWatchingSpotId: "",
  fitToTraceSignal: 0,
  mapFollowsAircraft: true,
};

function toggleValue(value) {
  return !value;
}

function applyMapSettingsToUiState(state, settings) {
  const normalizedSettings = normalizeMapSettings(settings);
  const layers = mapSettingsToExplorerLayers(normalizedSettings);
  const userLocationPreferences =
    mapSettingsToUserLocationPreferences(normalizedSettings);
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
    case "toggleCandidateWatchingSpots":
      return applyManualLayerToggle(
        state,
        MAP_LAYER_KEYS.CANDIDATE_WATCHING_SPOTS,
        toggleValue(state.showCandidateWatchingSpots),
      );
    case "toggleShowCallsigns":
      return applyManualLayerToggle(
        state,
        MAP_LAYER_KEYS.SHOW_CALLSIGNS,
        toggleValue(state.showCallsigns),
      );
    case "applyMapMode":
      if (!isSelectableMapModeId(action.modeId)) {
        return state;
      }
      return applyMapSettingsToUiState(
        state,
        buildPresetMapSettings({
          modeId: action.modeId,
          audioEnabled: state.mapSettings?.audioEnabled,
          // Carry the user's current base map choice across mode
          // switches — they picked it deliberately, no need to reset
          // it just because they cycled the mode preset.
          baseLayer: state.mapSettings?.baseLayer,
        }),
      );
    case "setMapBaseLayer":
      if (!isKnownMapBaseLayer(action.baseLayer)) return state;
      if (state.mapSettings?.baseLayer === action.baseLayer) return state;
      return applyMapSettingsToUiState(
        state,
        buildMapSettingsWithBaseLayer({
          settings: state.mapSettings,
          baseLayer: action.baseLayer,
        }),
      );
    case "hydrateMapSettings":
      return applyMapSettingsToUiState(state, action.settings);
    case "setUserLocationPreferences": {
      const userLocationEnabled = action.userLocationEnabled === true;
      const userLocationAudioEnabled =
        userLocationEnabled && action.userLocationAudioEnabled === true;
      const locationSettings = buildCustomMapSettings({
        settings: state.mapSettings,
        layerKey: MAP_LAYER_KEYS.USER_LOCATION,
        value: userLocationEnabled,
      });
      return applyMapSettingsToUiState(
        state,
        buildCustomMapSettings({
          settings: locationSettings,
          layerKey: MAP_LAYER_KEYS.USER_LOCATION_AUDIO,
          value: userLocationAudioEnabled,
        }),
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
    case "clearAllPreviewSelections":
      // Used by the swipe-up-to-dismiss gesture: clears whatever entity
      // is currently selected (aircraft / airport / navaid / airspace /
      // watching spot) so the mobile preview card hides. No-op when
      // nothing is selected so React can bail on the dispatch.
      if (
        !state.selectedAircraftId &&
        !state.selectedAirportIcao &&
        !state.selectedNavaidKey &&
        !state.selectedAirspaceId &&
        !state.selectedCandidateWatchingSpotId
      ) {
        return state;
      }
      return {
        ...state,
        selectedAircraftId: "",
        selectedAirportIcao: "",
        selectedNavaidKey: "",
        selectedAirspaceId: "",
        selectedCandidateWatchingSpotId: "",
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
  const { getToken } = useAuth();
  const hasHydratedMapSettingsRef = useRef(false);
  const pendingMapSettingsHydrationRef = useRef(null);
  const persistedMapSettingsRef = useRef("");
  const [mapSettingsHydrated, setMapSettingsHydrated] = useState(false);
  const [mapSettingsSaveStatus, setMapSettingsSaveStatus] = useState("idle");
  const [mapSettingsSaveStatusCode, setMapSettingsSaveStatusCode] = useState<number | null>(null);
  const [mapSettingsSaveCycle, setMapSettingsSaveCycle] = useState(0);
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
    showCallsigns,
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
  const mapSettingsDevice = mapSettingsDeviceForSidebarMode(sidebarMode);
  const queueMapSettingsHydration = useCallback((settings) => {
    const normalizedSettings = normalizeMapSettings(settings);
    pendingMapSettingsHydrationRef.current = normalizedSettings;
    hasHydratedMapSettingsRef.current = false;
    setMapSettingsHydrated(false);
    dispatch({
      type: "hydrateMapSettings",
      settings: normalizedSettings,
    });
  }, []);
  const buildClerkAuthHeaders = useCallback(async () => {
    const token = await getToken?.().catch(() => "");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getToken]);

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
    setMapSettingsSaveStatus("idle");
    const cachedSettings = readStoredMapSettings(mapSettingsDevice);
    const hydratedSettings = resolveMapSettingsHydration({
      signedIn: false,
      userSettings: null,
      cachedSettings,
    });

    if (hydratedSettings.settings) {
      queueMapSettingsHydration(hydratedSettings.settings);
      return;
    }

    const effectiveSettings = hydratedSettings.settings
      ? hydratedSettings.settings
      : normalizeMapSettings(DEFAULT_MAP_SETTINGS);
    persistedMapSettingsRef.current = JSON.stringify(effectiveSettings);
    hasHydratedMapSettingsRef.current = true;
    setMapSettingsHydrated(true);
  }, [
    mapSettingsDevice,
    queueMapSettingsHydration,
  ]);

  useEffect(() => {
    if (!isLoaded) return undefined;
    const targets = resolveMapSettingsPersistenceTargets({
      authLoaded: isLoaded,
      signedIn: isSignedIn,
    });
    if (!targets.readDatabase) return undefined;

    let cancelled = false;

    const hydrateUserMapSettings = async () => {
      hasHydratedMapSettingsRef.current = false;
      setMapSettingsSaveStatus("idle");
      const cachedSettings = targets.readCache
        ? readStoredMapSettings(mapSettingsDevice)
        : null;
      let userSettings = null;

      try {
        const response = await fetch(`/api/map-settings?device=${mapSettingsDevice}`, {
          cache: "no-store",
          headers: await buildClerkAuthHeaders(),
        });
        if (response.ok) {
          const payload = await response.json();
          userSettings = payload?.settings
            ? normalizeMapSettings(payload.settings)
            : null;
        }
      } catch {
        userSettings = null;
      }

      if (cancelled) return;
      const hydratedSettings = resolveMapSettingsHydration({
        signedIn: true,
        userSettings,
        cachedSettings,
      });
      if (hydratedSettings.settings) {
        queueMapSettingsHydration(hydratedSettings.settings);
        if (hydratedSettings.source === "user" && targets.writeCache) {
          writeStoredMapSettings(hydratedSettings.settings, mapSettingsDevice);
        }
        return;
      }

      const effectiveSettings = hydratedSettings.settings
        ? hydratedSettings.settings
        : normalizeMapSettings(DEFAULT_MAP_SETTINGS);
      persistedMapSettingsRef.current = JSON.stringify(effectiveSettings);
      hasHydratedMapSettingsRef.current = true;
      if (!cancelled) setMapSettingsHydrated(true);
    };

    hydrateUserMapSettings();

    return () => {
      cancelled = true;
    };
  }, [
    isLoaded,
    isSignedIn,
    buildClerkAuthHeaders,
    mapSettingsDevice,
    queueMapSettingsHydration,
  ]);

  useEffect(() => {
    const hydrationCommit = resolveMapSettingsHydrationCommit({
      pendingSettings: pendingMapSettingsHydrationRef.current,
      currentSettings: mapSettings,
    });
    if (hydrationCommit.pending) {
      return undefined;
    }
    if (hydrationCommit.committed) {
      pendingMapSettingsHydrationRef.current = null;
      persistedMapSettingsRef.current = hydrationCommit.serialized;
      hasHydratedMapSettingsRef.current = true;
      setMapSettingsHydrated(true);
      return undefined;
    }

    if (
      !hasHydratedMapSettingsRef.current
    ) {
      return undefined;
    }
    const nextSettings = normalizeMapSettings(mapSettings);
    const serialized = JSON.stringify(nextSettings);
    if (serialized === persistedMapSettingsRef.current) return undefined;
    const targets = resolveMapSettingsPersistenceTargets({
      authLoaded: isLoaded,
      signedIn: isSignedIn,
    });

    if (targets.writeCache) {
      writeStoredMapSettings(nextSettings, mapSettingsDevice);
    }

    if (!targets.writeDatabase) {
      persistedMapSettingsRef.current = serialized;
      return undefined;
    }

    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setMapSettingsSaveStatus("saving");
      setMapSettingsSaveStatusCode(null);
      setMapSettingsSaveCycle((c) => c + 1);
      try {
        const response = await fetch("/api/map-settings", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(await buildClerkAuthHeaders()),
          },
          body: JSON.stringify({ settings: nextSettings, device: mapSettingsDevice }),
          signal: controller.signal,
        });
        if (!response.ok) {
          if (!cancelled) setMapSettingsSaveStatusCode(response.status);
          throw new Error("save failed");
        }
        const payload = await response.json();
        const savedSettings = payload?.settings
          ? normalizeMapSettings(payload.settings)
          : nextSettings;
        const savedSerialized = JSON.stringify(savedSettings);
        if (cancelled) return;
        if (targets.writeCache) {
          writeStoredMapSettings(savedSettings, mapSettingsDevice);
        }
        persistedMapSettingsRef.current = savedSerialized;
        if (savedSerialized !== serialized) {
          dispatch({
            type: "hydrateMapSettings",
            settings: savedSettings,
          });
        }
        setMapSettingsSaveStatusCode(response.status);
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
    isLoaded,
    isSignedIn,
    buildClerkAuthHeaders,
    mapSettings,
    mapSettingsDevice,
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

  const toggleCandidateWatchingSpots = useCallback(() => {
    dispatch({ type: "toggleCandidateWatchingSpots" });
  }, []);

  const toggleShowCallsigns = useCallback(() => {
    dispatch({ type: "toggleShowCallsigns" });
  }, []);

  const applyMapMode = useCallback((modeId) => {
    dispatch({ type: "applyMapMode", modeId });
  }, []);

  const setMapBaseLayer = useCallback((baseLayer) => {
    dispatch({ type: "setMapBaseLayer", baseLayer });
  }, []);

  const setUserLocationPreferences = useCallback(
    ({ userLocationEnabled, userLocationAudioEnabled = false }) => {
      dispatch({
        type: "setUserLocationPreferences",
        userLocationEnabled,
        userLocationAudioEnabled,
      });
    },
    [],
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

  const clearAllPreviewSelections = useCallback(() => {
    dispatch({ type: "clearAllPreviewSelections" });
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
      showCandidateWatchingSpots,
      showCallsigns,
      userLocationEnabled,
      userLocationAudioEnabled,
      mapSettings,
      mapSettingsDevice,
      mapSettingsHydrated,
      mapSettingsSaveStatus,
      mapSettingsSaveStatusCode,
      mapSettingsSaveCycle,
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
      toggleShowCallsigns,
      applyMapMode,
      setMapBaseLayer,
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
      clearAllPreviewSelections,
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
      showCallsigns,
      userLocationEnabled,
      userLocationAudioEnabled,
      mapSettings,
      mapSettingsDevice,
      mapSettingsHydrated,
      mapSettingsSaveStatus,
      mapSettingsSaveStatusCode,
      mapSettingsSaveCycle,
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
      toggleShowCallsigns,
      applyMapMode,
      setMapBaseLayer,
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
      clearAllPreviewSelections,
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
