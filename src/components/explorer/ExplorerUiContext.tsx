import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { AIRPORT_EXPLORER_UI_CONFIG } from "@/config/aviation";
import {
  resolveClientDeviceLayoutProfile,
  type ClientLayoutMode,
} from "@/features/app-shell/device/clientDeviceModel";
import { resetViewportScroll } from "@/features/app-shell/viewportScroll";
import {
  useClientDeviceProfile,
} from "@/features/app-shell/device/useClientDeviceProfile";
import {
  DEFAULT_AIRPORT_EXPLORER_UI_STATE,
  normalizeAirspaceSelectionIds,
  resolveAirspaceSelectionForLayerVisibility,
} from "@/features/airport/explorer/airportExplorerUiModel";
import { normalizeAltitudeLevelSelection } from "@/features/aircraft/filters/aircraftFilters";
import {
  DEFAULT_MAP_SETTINGS,
  MAP_LAYER_KEYS,
  buildCustomMapSettings,
  buildMapSettingsWithBaseLayer,
  isKnownMapBaseLayer,
  mapSettingsToExplorerLayers,
  mapSettingsToUserLocationPreferences,
  normalizeMapSettings,
  resolveMapSettingsDeviceForClientDeviceProfile,
  serializeMapSettingsPersistenceSignature,
  resolveStoredMapSettings,
} from "@/features/airport/map-settings/mapSettingsModel";
import {
  readStoredMapSettings,
  writeStoredMapSettings,
} from "@/features/airport/map-settings/mapSettingsStorage";
const ExplorerUiContext = createContext(null);
// 按变更频率/关注点拆出的聚焦切片 context。只读某一组状态的消费者(如 AircraftTable
// 只读 filters、MapFitToTraceController 只读 selection)订阅对应切片,即可在无关字段
// (selection / mapZoom / 图层开关 等)变化时跳过重渲染——前提是该消费者本身被 memo
// 化,从而不被父组件级联重渲染。useExplorerUi() 仍提供完整聚合(facade),读取面广的
// 消费者(AirportExplorer / ExplorerMapMenu / FlightExplorer)无需改动。
const ExplorerFilterContext = createContext(null);
const ExplorerSelectionContext = createContext(null);
const DEFAULT_USER_LOCATION_PREFERENCES =
  mapSettingsToUserLocationPreferences(DEFAULT_MAP_SETTINGS);

const getInitialMapViewMode = () =>
  typeof window !== "undefined" &&
  window.localStorage.getItem("adsbao:map-view-mode:v1") === "3d"
    ? "3d"
    : "2d";

const initialUiState = {
  ...DEFAULT_AIRPORT_EXPLORER_UI_STATE,
  ...mapSettingsToExplorerLayers(DEFAULT_MAP_SETTINGS),
  ...DEFAULT_USER_LOCATION_PREFERENCES,
  mapSettings: DEFAULT_MAP_SETTINGS,
  sidebarMode: "desktop",
  sidebarOpen: true,
  selectedAircraftId: "",
  selectedAirportIcao: "",
  selectedNavaidKey: "",
  selectedReportingPointKey: "",
  selectedAirspaceId: "",
  selectedAirspaceIds: [],
  selectedCandidateWatchingSpotId: "",
  fitToTraceSignal: 0,
  mapFollowsAircraft: true,
  mapViewMode: getInitialMapViewMode(),
};

function getExplorerLayoutProfile(clientDeviceProfile) {
  return resolveClientDeviceLayoutProfile({
    mobileBreakpointPx: AIRPORT_EXPLORER_UI_CONFIG.mobileBreakpointPx,
    profile: clientDeviceProfile,
  });
}

function getSidebarOpenForLayoutMode(mode: ClientLayoutMode) {
  return mode === "desktop";
}

function getInitialUiState(clientDeviceProfile) {
  const sidebarMode = getExplorerLayoutProfile(clientDeviceProfile).layoutMode;
  return {
    ...initialUiState,
    sidebarMode,
    sidebarOpen: getSidebarOpenForLayoutMode(sidebarMode),
  };
}

function resetExplorerMapViewportScroll() {
  const kit = document.querySelector(".airport-map-kit");
  if (!kit) return;

  resetViewportScroll();
  kit.querySelectorAll<HTMLElement>(".sidebar-shell").forEach((element) => {
    element.scrollTop = 0;
    element.scrollLeft = 0;
  });
}

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
    selectedAirspaceIds: layers.showAirspaces ? state.selectedAirspaceIds : [],
    selectedReportingPointKey: layers.showReportingPoints
      ? state.selectedReportingPointKey
      : "",
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
        sidebarOpen: getSidebarOpenForLayoutMode(action.sidebarMode),
      };
    }
    case "toggleSidebar":
      return {
        ...state,
        sidebarOpen: toggleValue(state.sidebarOpen),
      };
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
    case "setMapViewMode": {
      const mapViewMode = action.mapViewMode === "3d" ? "3d" : "2d";
      if (state.mapViewMode === mapViewMode) return state;
      window.localStorage.setItem("adsbao:map-view-mode:v1", mapViewMode);
      return { ...state, mapViewMode };
    }
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
    case "toggleReportingPoints":
      return applyManualLayerToggle(
        state,
        MAP_LAYER_KEYS.REPORTING_POINTS,
        toggleValue(state.showReportingPoints),
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
      return applyMapSettingsToUiState(
        state,
        buildCustomMapSettings({
          settings: state.mapSettings,
          layerKey: MAP_LAYER_KEYS.USER_LOCATION,
          value: userLocationEnabled,
        }),
      );
    }
    case "setAirborneFilter":
      return { ...state, airborneFilter: action.airborneFilter };
    case "setTypeFilter":
      return { ...state, typeFilter: action.typeFilter };
    case "setAltitudeLevel":
      return {
        ...state,
        altitudeLevel: normalizeAltitudeLevelSelection(action.altitudeLevel),
      };
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
        selectedReportingPointKey: "",
        selectedAirspaceId: "",
        selectedAirspaceIds: [],
        selectedCandidateWatchingSpotId: "",
      };
    case "setSelectedAircraftId":
      return {
        ...state,
        selectedAircraftId: action.aircraftId,
        selectedAirportIcao: "",
        selectedNavaidKey: "",
        selectedReportingPointKey: "",
        selectedAirspaceId: "",
        selectedAirspaceIds: [],
        selectedCandidateWatchingSpotId: "",
      };
    case "selectAirport":
      return {
        ...state,
        selectedAirportIcao:
          state.selectedAirportIcao === action.icao ? "" : action.icao,
        selectedAircraftId: "",
        selectedNavaidKey: "",
        selectedReportingPointKey: "",
        selectedAirspaceId: "",
        selectedAirspaceIds: [],
        selectedCandidateWatchingSpotId: "",
      };
    case "selectNavaid":
      return {
        ...state,
        selectedNavaidKey:
          state.selectedNavaidKey === action.navaidKey ? "" : action.navaidKey,
        selectedAircraftId: "",
        selectedAirportIcao: "",
        selectedReportingPointKey: "",
        selectedAirspaceId: "",
        selectedAirspaceIds: [],
        selectedCandidateWatchingSpotId: "",
      };
    case "setSelectedNavaidKey":
      return {
        ...state,
        selectedNavaidKey: action.navaidKey,
        selectedAircraftId: "",
        selectedAirportIcao: "",
        selectedReportingPointKey: "",
        selectedAirspaceId: "",
        selectedAirspaceIds: [],
        selectedCandidateWatchingSpotId: "",
      };
    case "selectReportingPoint":
      if (!state.showReportingPoints) {
        return state.selectedReportingPointKey
          ? { ...state, selectedReportingPointKey: "" }
          : state;
      }
      return {
        ...state,
        selectedReportingPointKey:
          state.selectedReportingPointKey === action.reportingPointKey
            ? ""
            : action.reportingPointKey,
        selectedAircraftId: "",
        selectedAirportIcao: "",
        selectedNavaidKey: "",
        selectedAirspaceId: "",
        selectedAirspaceIds: [],
        selectedCandidateWatchingSpotId: "",
      };
    case "setSelectedReportingPointKey":
      return {
        ...state,
        selectedReportingPointKey: action.reportingPointKey,
        selectedAircraftId: "",
        selectedAirportIcao: "",
        selectedNavaidKey: "",
        selectedAirspaceId: "",
        selectedAirspaceIds: [],
        selectedCandidateWatchingSpotId: "",
      };
    case "selectAirspace": {
      if (!state.showAirspaces) {
        return state.selectedAirspaceId
          ? { ...state, selectedAirspaceId: "", selectedAirspaceIds: [] }
          : state;
      }
      const selection = resolveAirspaceSelectionForLayerVisibility({
        showAirspaces: state.showAirspaces,
        selectedAirspaceId: state.selectedAirspaceId,
        airspaceIds: action.airspaceIds ?? action.airspaceId,
      });
      return {
        ...state,
        selectedAirspaceId: selection.selectedAirspaceId,
        selectedAirspaceIds: selection.selectedAirspaceIds,
        selectedAircraftId: "",
        selectedAirportIcao: "",
        selectedNavaidKey: "",
        selectedReportingPointKey: "",
        selectedCandidateWatchingSpotId: "",
      };
    }
    case "setSelectedAirspaceId": {
      if (!state.showAirspaces) {
        return state.selectedAirspaceId
          ? { ...state, selectedAirspaceId: "", selectedAirspaceIds: [] }
          : state;
      }
      const nextAirspaceId = String(action.airspaceId || "").trim();
      const nextAirspaceIds = nextAirspaceId
        ? normalizeAirspaceSelectionIds([
            ...state.selectedAirspaceIds,
            nextAirspaceId,
          ])
        : [];
      return {
        ...state,
        selectedAirspaceId: nextAirspaceId,
        selectedAirspaceIds: nextAirspaceIds,
        selectedAircraftId: "",
        selectedAirportIcao: "",
        selectedNavaidKey: "",
        selectedReportingPointKey: "",
        selectedCandidateWatchingSpotId: "",
      };
    }
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
        selectedReportingPointKey: "",
        selectedAirspaceId: "",
        selectedAirspaceIds: [],
      };
    case "setSelectedCandidateWatchingSpotId":
      return {
        ...state,
        selectedCandidateWatchingSpotId: action.spotId,
        selectedAircraftId: "",
        selectedAirportIcao: "",
        selectedNavaidKey: "",
        selectedReportingPointKey: "",
        selectedAirspaceId: "",
        selectedAirspaceIds: [],
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
        !state.selectedReportingPointKey &&
        !state.selectedAirspaceId &&
        state.selectedAirspaceIds.length === 0 &&
        !state.selectedCandidateWatchingSpotId
      ) {
        return state;
      }
      return {
        ...state,
        selectedAircraftId: "",
        selectedAirportIcao: "",
        selectedNavaidKey: "",
        selectedReportingPointKey: "",
        selectedAirspaceId: "",
        selectedAirspaceIds: [],
        selectedCandidateWatchingSpotId: "",
      };
    case "fitToTrace":
      return {
        ...state,
        fitToTraceSignal: state.fitToTraceSignal + 1,
        mapFollowsAircraft: false,
      };
    case "resumeMapFollow":
      if (state.mapFollowsAircraft) return state;
      return {
        ...state,
        mapFollowsAircraft: true,
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
  const [mapSettingsHydrated, setMapSettingsHydrated] = useState(false);
  const [mapSettingsSaveStatus, setMapSettingsSaveStatus] = useState("idle");
  const [mapSettingsSaveCycle, setMapSettingsSaveCycle] = useState(0);
  const clientDeviceProfile = useClientDeviceProfile({
    includeSafeAreaInsets: true,
  });
  const clientDeviceLayout = useMemo(
    () => getExplorerLayoutProfile(clientDeviceProfile),
    [clientDeviceProfile],
  );
  const [state, dispatch] = useReducer(
    airportExplorerUiReducer,
    clientDeviceProfile,
    getInitialUiState,
  );
  const {
    sidebarMode,
    sidebarOpen,
    mapZoom,
    mapViewMode,
    mapLabelLevel,
    showRunwayBeams,
    showNavaidMarkers,
    showReportingPoints,
    showAirspaces,
    showCandidateWatchingSpots,
    showCallsigns,
    userLocationEnabled,
    mapSettings,
    airborneFilter,
    typeFilter,
    altitudeLevel,
    entityFilter,
    selectedAircraftId,
    selectedAirportIcao,
    selectedNavaidKey,
    selectedReportingPointKey,
    selectedAirspaceId,
    selectedAirspaceIds,
    selectedCandidateWatchingSpotId,
  } = state;
  const effectiveSidebarMode =
    sidebarMode === clientDeviceLayout.layoutMode
      ? sidebarMode
      : clientDeviceLayout.layoutMode;
  const effectiveSidebarOpen =
    sidebarMode === effectiveSidebarMode
      ? sidebarOpen
      : getSidebarOpenForLayoutMode(effectiveSidebarMode);
  const isMobile = clientDeviceLayout.isMobileLayout;
  const mapSettingsDevice =
    resolveMapSettingsDeviceForClientDeviceProfile(clientDeviceProfile);
  const hydrateLocalMapSettings = useCallback((settings) => {
    setMapSettingsHydrated(false);
    dispatch({
      type: "hydrateMapSettings",
      settings: normalizeMapSettings(settings),
    });
  }, []);

  useEffect(() => {
    dispatch({
      type: "setSidebarMode",
      sidebarMode: clientDeviceLayout.layoutMode,
    });
  }, [clientDeviceLayout.layoutMode]);

  useEffect(() => {
    if (
      effectiveSidebarMode !== "desktop" ||
      clientDeviceLayout.orientation !== "landscape"
    ) {
      return undefined;
    }

    resetExplorerMapViewportScroll();
    const frameId = window.requestAnimationFrame(resetExplorerMapViewportScroll);
    const timeoutId = window.setTimeout(resetExplorerMapViewportScroll, 180);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [
    effectiveSidebarMode,
    clientDeviceLayout.orientation,
    clientDeviceLayout.safeAreaInsets.left,
    clientDeviceLayout.safeAreaInsets.right,
  ]);

  useEffect(() => {
    setMapSettingsSaveStatus("idle");
    const storedSettings = resolveStoredMapSettings(
      readStoredMapSettings(mapSettingsDevice),
    );
    hydrateLocalMapSettings(storedSettings.settings);
  }, [
    mapSettingsDevice,
    hydrateLocalMapSettings,
  ]);

  useEffect(() => {
    setMapSettingsHydrated(true);
  }, [mapSettings]);

  const toggleSidebar = useCallback(() => {
    dispatch({ type: "toggleSidebar" });
  }, []);

  const closeSidebar = useCallback(() => {
    dispatch({ type: "closeSidebar" });
  }, []);

  const setMapZoom = useCallback((mapZoom) => {
    dispatch({ type: "setMapZoom", mapZoom });
  }, []);

  const setMapViewMode = useCallback((mapViewMode) => {
    dispatch({ type: "setMapViewMode", mapViewMode });
  }, []);

  const saveMapSettings = useCallback(
    async (settings) => {
      const nextSettings = normalizeMapSettings(settings);
      const nextSignature =
        serializeMapSettingsPersistenceSignature(nextSettings);
      const previousSignature =
        serializeMapSettingsPersistenceSignature(mapSettings);
      if (nextSignature === previousSignature) return true;

      dispatch({ type: "hydrateMapSettings", settings: nextSettings });
      setMapSettingsSaveStatus("saving");
      setMapSettingsSaveCycle((cycle) => cycle + 1);
      writeStoredMapSettings(nextSettings, mapSettingsDevice);
      setMapSettingsSaveStatus("saved");
      return true;
    },
    [mapSettings, mapSettingsDevice],
  );

  const toggleRunwayBeams = useCallback(() => {
    dispatch({ type: "toggleRunwayBeams" });
  }, []);

  const toggleNavaidMarkers = useCallback(() => {
    dispatch({ type: "toggleNavaidMarkers" });
  }, []);

  const toggleReportingPoints = useCallback(() => {
    dispatch({ type: "toggleReportingPoints" });
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

  const setMapBaseLayer = useCallback((baseLayer) => {
    dispatch({ type: "setMapBaseLayer", baseLayer });
  }, []);

  const setUserLocationPreferences = useCallback(
    ({ userLocationEnabled }) => {
      dispatch({
        type: "setUserLocationPreferences",
        userLocationEnabled,
      });
    },
    [],
  );

  const setAirborneFilter = useCallback((airborneFilter) => {
    dispatch({ type: "setAirborneFilter", airborneFilter });
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

  const selectReportingPoint = useCallback((reportingPointKey) => {
    dispatch({ type: "selectReportingPoint", reportingPointKey });
  }, []);

  const setSelectedReportingPointKey = useCallback((reportingPointKey) => {
    dispatch({ type: "setSelectedReportingPointKey", reportingPointKey });
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

  const resumeMapFollow = useCallback(() => {
    dispatch({ type: "resumeMapFollow" });
  }, []);

  const suspendMapFollow = useCallback(() => {
    dispatch({ type: "suspendMapFollow" });
  }, []);

  const fitToTraceSignal = state.fitToTraceSignal;
  const mapFollowsAircraft = state.mapFollowsAircraft;
  const mapSettingsReadyForUserLocation = mapSettingsHydrated;
  const value = useMemo(
    () => ({
      desktopSidebarWidth: AIRPORT_EXPLORER_UI_CONFIG.desktopSidebarWidth,
      clientDeviceProfile,
      clientDeviceLayout,
      sidebarMode: effectiveSidebarMode,
      sidebarOpen: effectiveSidebarOpen,
      isMobile,
      mapZoom,
      mapViewMode,
      mapFollowsAircraft,
      mapLabelLevel,
      showRunwayBeams,
      showNavaidMarkers,
      showReportingPoints,
      showAirspaces,
      showCandidateWatchingSpots,
      showCallsigns,
      userLocationEnabled,
      mapSettings,
      mapSettingsDevice,
      mapSettingsHydrated,
      mapSettingsReadyForUserLocation,
      mapSettingsSaveStatus,
      mapSettingsSaveCycle,
      airborneFilter,
      typeFilter,
      altitudeLevel,
      entityFilter,
      selectedAircraftId,
      selectedAirportIcao,
      selectedNavaidKey,
      selectedReportingPointKey,
      selectedAirspaceId,
      selectedAirspaceIds,
      selectedCandidateWatchingSpotId,
      fitToTraceSignal,
      setMapZoom,
      setMapViewMode,
      setAirborneFilter,
      setTypeFilter,
      setAltitudeLevel,
      setEntityFilter,
      toggleSidebar,
      closeSidebar,
      toggleRunwayBeams,
      toggleNavaidMarkers,
      toggleReportingPoints,
      toggleAirspaces,
      toggleCandidateWatchingSpots,
      toggleShowCallsigns,
      setMapBaseLayer,
      setUserLocationPreferences,
      saveMapSettings,
      selectAircraft,
      setSelectedAircraftId,
      selectAirport,
      selectNavaid,
      setSelectedNavaidKey,
      selectReportingPoint,
      setSelectedReportingPointKey,
      selectAirspace,
      setSelectedAirspaceId,
      selectCandidateWatchingSpot,
      setSelectedCandidateWatchingSpotId,
      clearAllPreviewSelections,
      fitToTrace,
      resumeMapFollow,
      suspendMapFollow,
    }),
    [
      clientDeviceProfile,
      clientDeviceLayout,
      effectiveSidebarMode,
      effectiveSidebarOpen,
      isMobile,
      mapZoom,
      mapViewMode,
      mapFollowsAircraft,
      mapLabelLevel,
      showRunwayBeams,
      showNavaidMarkers,
      showReportingPoints,
      showAirspaces,
      showCandidateWatchingSpots,
      showCallsigns,
      userLocationEnabled,
      mapSettings,
      mapSettingsDevice,
      mapSettingsHydrated,
      mapSettingsReadyForUserLocation,
      mapSettingsSaveStatus,
      mapSettingsSaveCycle,
      airborneFilter,
      typeFilter,
      altitudeLevel,
      entityFilter,
      selectedAircraftId,
      selectedAirportIcao,
      selectedNavaidKey,
      selectedReportingPointKey,
      selectedAirspaceId,
      selectedAirspaceIds,
      selectedCandidateWatchingSpotId,
      fitToTraceSignal,
      setMapZoom,
      setMapViewMode,
      setAirborneFilter,
      setTypeFilter,
      setAltitudeLevel,
      setEntityFilter,
      toggleSidebar,
      closeSidebar,
      toggleRunwayBeams,
      toggleNavaidMarkers,
      toggleReportingPoints,
      toggleAirspaces,
      toggleCandidateWatchingSpots,
      toggleShowCallsigns,
      setMapBaseLayer,
      setUserLocationPreferences,
      saveMapSettings,
      selectAircraft,
      setSelectedAircraftId,
      selectAirport,
      selectNavaid,
      setSelectedNavaidKey,
      selectReportingPoint,
      setSelectedReportingPointKey,
      selectAirspace,
      setSelectedAirspaceId,
      selectCandidateWatchingSpot,
      setSelectedCandidateWatchingSpotId,
      clearAllPreviewSelections,
      fitToTrace,
      resumeMapFollow,
      suspendMapFollow,
    ],
  );

  // 切片:filters。回调都是 useCallback 稳定引用,因此本 memo 实际只在筛选状态变化时
  // 产生新对象 → 订阅它的 AircraftTable 不再因 selection/zoom/图层变化而重渲染。
  const filterValue = useMemo(
    () => ({
      airborneFilter,
      typeFilter,
      altitudeLevel,
      entityFilter,
      setAirborneFilter,
      setTypeFilter,
      setAltitudeLevel,
      setEntityFilter,
    }),
    [
      airborneFilter,
      typeFilter,
      altitudeLevel,
      entityFilter,
      setAirborneFilter,
      setTypeFilter,
      setAltitudeLevel,
      setEntityFilter,
    ],
  );

  // 切片:selection(选中实体 + 选择/fit/follow 回调)。只在选中相关状态变化时更新。
  const selectionValue = useMemo(
    () => ({
      selectedAircraftId,
      selectedAirportIcao,
      selectedNavaidKey,
      selectedReportingPointKey,
      selectedAirspaceId,
      selectedAirspaceIds,
      selectedCandidateWatchingSpotId,
      fitToTraceSignal,
      mapFollowsAircraft,
      selectAircraft,
      setSelectedAircraftId,
      selectAirport,
      selectNavaid,
      setSelectedNavaidKey,
      selectReportingPoint,
      setSelectedReportingPointKey,
      selectAirspace,
      setSelectedAirspaceId,
      selectCandidateWatchingSpot,
      setSelectedCandidateWatchingSpotId,
      clearAllPreviewSelections,
      fitToTrace,
      resumeMapFollow,
      suspendMapFollow,
    }),
    [
      selectedAircraftId,
      selectedAirportIcao,
      selectedNavaidKey,
      selectedReportingPointKey,
      selectedAirspaceId,
      selectedAirspaceIds,
      selectedCandidateWatchingSpotId,
      fitToTraceSignal,
      mapFollowsAircraft,
      selectAircraft,
      setSelectedAircraftId,
      selectAirport,
      selectNavaid,
      setSelectedNavaidKey,
      selectReportingPoint,
      setSelectedReportingPointKey,
      selectAirspace,
      setSelectedAirspaceId,
      selectCandidateWatchingSpot,
      setSelectedCandidateWatchingSpotId,
      clearAllPreviewSelections,
      fitToTrace,
      resumeMapFollow,
      suspendMapFollow,
    ],
  );

  return (
    <ExplorerUiContext.Provider value={value}>
      <ExplorerFilterContext.Provider value={filterValue}>
        <ExplorerSelectionContext.Provider value={selectionValue}>
          {children}
        </ExplorerSelectionContext.Provider>
      </ExplorerFilterContext.Provider>
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

// 聚焦切片 hook:只订阅 filters,避免无关字段变化造成的重渲染(配合 memo 化的消费者)。
export function useExplorerFilters() {
  const context = useContext(ExplorerFilterContext);
  if (!context) {
    throw new Error("useExplorerFilters must be used within ExplorerUiProvider");
  }
  return context;
}

// 聚焦切片 hook:只订阅 selection。
export function useExplorerSelection() {
  const context = useContext(ExplorerSelectionContext);
  if (!context) {
    throw new Error(
      "useExplorerSelection must be used within ExplorerUiProvider",
    );
  }
  return context;
}
