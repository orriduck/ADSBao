type MapSettingsRecord = Record<string, any>;
type MapSettingsOptions = Record<string, any>;

export const MAP_MODE_IDS = Object.freeze({
  SPOTTING: "spotting",
  RADIO: "radio",
  CONTROLLER: "controller",
  IMMERSIVE: "immersive",
  CUSTOM: "custom",
});

export const MAP_LAYER_KEYS = Object.freeze({
  MAP_LABELS: "mapLabels",
  APPROACH_BEAMS: "approachBeams",
  NAVAID_MARKERS: "navaidMarkers",
  AIRSPACES: "airspaces",
  CANDIDATE_WATCHING_SPOTS: "candidateWatchingSpots",
  USER_LOCATION: "userLocation",
  USER_LOCATION_AUDIO: "userLocationAudio",
});

const PERSISTED_MAP_LAYER_KEYS = Object.freeze([
  MAP_LAYER_KEYS.MAP_LABELS,
  MAP_LAYER_KEYS.APPROACH_BEAMS,
  MAP_LAYER_KEYS.NAVAID_MARKERS,
  MAP_LAYER_KEYS.AIRSPACES,
  MAP_LAYER_KEYS.CANDIDATE_WATCHING_SPOTS,
  MAP_LAYER_KEYS.USER_LOCATION,
  MAP_LAYER_KEYS.USER_LOCATION_AUDIO,
]);

const MAP_MODE_PRESETS = Object.freeze({
  [MAP_MODE_IDS.SPOTTING]: Object.freeze({
    id: MAP_MODE_IDS.SPOTTING,
    labelKey: "mapSettings.modes.spotting",
    descriptionKey: "mapSettings.modeDescriptions.spotting",
    iconKey: "telescope",
    layers: Object.freeze({
      [MAP_LAYER_KEYS.MAP_LABELS]: true,
      [MAP_LAYER_KEYS.APPROACH_BEAMS]: true,
      [MAP_LAYER_KEYS.NAVAID_MARKERS]: false,
      [MAP_LAYER_KEYS.AIRSPACES]: false,
      [MAP_LAYER_KEYS.CANDIDATE_WATCHING_SPOTS]: true,
      [MAP_LAYER_KEYS.USER_LOCATION]: false,
      [MAP_LAYER_KEYS.USER_LOCATION_AUDIO]: false,
    }),
  }),
  [MAP_MODE_IDS.RADIO]: Object.freeze({
    id: MAP_MODE_IDS.RADIO,
    labelKey: "mapSettings.modes.radio",
    descriptionKey: "mapSettings.modeDescriptions.radio",
    iconKey: "radar",
    layers: Object.freeze({
      [MAP_LAYER_KEYS.MAP_LABELS]: true,
      [MAP_LAYER_KEYS.APPROACH_BEAMS]: false,
      [MAP_LAYER_KEYS.NAVAID_MARKERS]: true,
      [MAP_LAYER_KEYS.AIRSPACES]: false,
      [MAP_LAYER_KEYS.CANDIDATE_WATCHING_SPOTS]: false,
      [MAP_LAYER_KEYS.USER_LOCATION]: false,
      [MAP_LAYER_KEYS.USER_LOCATION_AUDIO]: false,
    }),
  }),
  [MAP_MODE_IDS.CONTROLLER]: Object.freeze({
    id: MAP_MODE_IDS.CONTROLLER,
    labelKey: "mapSettings.modes.controller",
    descriptionKey: "mapSettings.modeDescriptions.controller",
    iconKey: "monitor",
    layers: Object.freeze({
      [MAP_LAYER_KEYS.MAP_LABELS]: true,
      [MAP_LAYER_KEYS.APPROACH_BEAMS]: true,
      [MAP_LAYER_KEYS.NAVAID_MARKERS]: false,
      [MAP_LAYER_KEYS.AIRSPACES]: true,
      [MAP_LAYER_KEYS.CANDIDATE_WATCHING_SPOTS]: false,
      [MAP_LAYER_KEYS.USER_LOCATION]: false,
      [MAP_LAYER_KEYS.USER_LOCATION_AUDIO]: false,
    }),
  }),
  [MAP_MODE_IDS.IMMERSIVE]: Object.freeze({
    id: MAP_MODE_IDS.IMMERSIVE,
    labelKey: "mapSettings.modes.immersive",
    descriptionKey: "mapSettings.modeDescriptions.immersive",
    iconKey: "crosshair",
    layers: Object.freeze({
      [MAP_LAYER_KEYS.MAP_LABELS]: false,
      [MAP_LAYER_KEYS.APPROACH_BEAMS]: false,
      [MAP_LAYER_KEYS.NAVAID_MARKERS]: false,
      [MAP_LAYER_KEYS.AIRSPACES]: false,
      [MAP_LAYER_KEYS.CANDIDATE_WATCHING_SPOTS]: false,
      [MAP_LAYER_KEYS.USER_LOCATION]: false,
      [MAP_LAYER_KEYS.USER_LOCATION_AUDIO]: false,
    }),
  }),
});

export const MAP_MODE_OPTIONS = Object.freeze([
  MAP_MODE_PRESETS[MAP_MODE_IDS.SPOTTING],
  MAP_MODE_PRESETS[MAP_MODE_IDS.RADIO],
  MAP_MODE_PRESETS[MAP_MODE_IDS.CONTROLLER],
  MAP_MODE_PRESETS[MAP_MODE_IDS.IMMERSIVE],
]);

export const CUSTOM_MAP_MODE_OPTION = Object.freeze({
  id: MAP_MODE_IDS.CUSTOM,
  labelKey: "mapSettings.modes.custom",
  descriptionKey: "mapSettings.modeDescriptions.custom",
  iconKey: "slidersHorizontal",
  layers: Object.freeze({}),
});

export const DISABLED_MAP_MODE_IDS = Object.freeze([]);

export const DEFAULT_MAP_SETTINGS: MapSettingsRecord = Object.freeze({
  selectedMode: MAP_MODE_IDS.CONTROLLER,
  baseMode: MAP_MODE_IDS.CONTROLLER,
  layerOverrides: Object.freeze({}),
  audioEnabled: false,
  hasSelectedMode: false,
  updatedAt: "",
});

const MAP_MODE_ID_SET: Set<string> = new Set(Object.values(MAP_MODE_IDS));
const PRESET_MODE_ID_SET: Set<string> = new Set(MAP_MODE_OPTIONS.map((mode) => mode.id));
const LAYER_KEY_SET: Set<string> = new Set(PERSISTED_MAP_LAYER_KEYS);
const DISABLED_MAP_MODE_ID_SET: Set<string> = new Set(DISABLED_MAP_MODE_IDS);

function getMapModePreset(modeId) {
  return MAP_MODE_PRESETS[modeId] || MAP_MODE_PRESETS[DEFAULT_MAP_SETTINGS.baseMode];
}

function isMapModeId(value) {
  return MAP_MODE_ID_SET.has(value);
}

function isPresetMapModeId(value) {
  return PRESET_MODE_ID_SET.has(value);
}

export function isSelectableMapModeId(value) {
  if (!isPresetMapModeId(value) || DISABLED_MAP_MODE_ID_SET.has(value)) {
    return false;
  }
  return true;
}

export function getSelectableMapModeOptions() {
  return MAP_MODE_OPTIONS.filter((mode) => isSelectableMapModeId(mode.id));
}

function getMapSettingsBaseMode(
  settings: MapSettingsRecord = {},
) {
  const selectedMode = settings?.selectedMode;
  const baseMode = settings?.baseMode;
  if (isSelectableMapModeId(selectedMode)) return selectedMode;
  if (isSelectableMapModeId(baseMode)) return baseMode;
  return DEFAULT_MAP_SETTINGS.baseMode;
}

function normalizeMapLayerOverrides(layerOverrides: unknown) {
  if (
    !layerOverrides ||
    typeof layerOverrides !== "object" ||
    Array.isArray(layerOverrides)
  ) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(layerOverrides)
      .filter(([key, value]) => LAYER_KEY_SET.has(key) && typeof value === "boolean")
      .map(([key, value]) => [key, value]),
  );
}

export function normalizeMapSettings(
  settings: MapSettingsRecord = {},
) {
  const selectedMode = isMapModeId(settings?.selectedMode)
    ? settings.selectedMode
    : DEFAULT_MAP_SETTINGS.selectedMode;
  const baseMode = isSelectableMapModeId(settings?.baseMode)
    ? settings.baseMode
    : isSelectableMapModeId(selectedMode)
      ? selectedMode
      : DEFAULT_MAP_SETTINGS.baseMode;

  return {
    selectedMode,
    baseMode,
    layerOverrides: normalizeMapLayerOverrides(settings?.layerOverrides),
    audioEnabled: settings?.audioEnabled === true,
    hasSelectedMode:
      settings?.hasSelectedMode === true || settings?.has_selected_mode === true,
    updatedAt: String(settings?.updatedAt || settings?.updated_at || ""),
  };
}

export function resolveMapSettingsHydration({
  signedIn = false,
  userSettings = null,
  cachedSettings = null,
}: MapSettingsOptions = {}) {
  const normalizedUserSettings = userSettings
    ? normalizeMapSettings(userSettings)
    : null;
  const normalizedCachedSettings = cachedSettings
    ? normalizeMapSettings(cachedSettings)
    : null;

  if (signedIn && normalizedUserSettings) {
    return { source: "user", settings: normalizedUserSettings };
  }
  if (normalizedCachedSettings) {
    return { source: "cache", settings: normalizedCachedSettings };
  }
  return { source: "empty", settings: null };
}

function hasOwnSetting(settings: MapSettingsRecord, key: string) {
  return Object.prototype.hasOwnProperty.call(settings || {}, key);
}

export function mergeMapSettings({
  settings = DEFAULT_MAP_SETTINGS,
  updates = {},
}: MapSettingsOptions = {}) {
  const normalized = normalizeMapSettings(settings);
  const updateRecord =
    updates && typeof updates === "object" && !Array.isArray(updates)
      ? updates
      : {};
  const replacingMode =
    hasOwnSetting(updateRecord, "selectedMode") ||
    hasOwnSetting(updateRecord, "baseMode");
  const nextLayerOverrides = hasOwnSetting(updateRecord, "layerOverrides")
    ? replacingMode
      ? normalizeMapLayerOverrides(updateRecord.layerOverrides)
      : {
          ...normalized.layerOverrides,
          ...normalizeMapLayerOverrides(updateRecord.layerOverrides),
        }
    : normalized.layerOverrides;
  const selectedMode =
    hasOwnSetting(updateRecord, "selectedMode") &&
    isMapModeId(updateRecord.selectedMode)
      ? updateRecord.selectedMode
      : normalized.selectedMode;
  const baseMode =
    hasOwnSetting(updateRecord, "baseMode") &&
    isSelectableMapModeId(updateRecord.baseMode)
      ? updateRecord.baseMode
      : normalized.baseMode;

  return normalizeMapSettings({
    selectedMode,
    baseMode,
    layerOverrides: nextLayerOverrides,
    audioEnabled: hasOwnSetting(updateRecord, "audioEnabled")
      ? updateRecord.audioEnabled === true
      : normalized.audioEnabled,
    hasSelectedMode:
      hasOwnSetting(updateRecord, "hasSelectedMode") ||
      hasOwnSetting(updateRecord, "has_selected_mode")
        ? updateRecord.hasSelectedMode === true ||
          updateRecord.has_selected_mode === true
        : normalized.hasSelectedMode,
    updatedAt:
      hasOwnSetting(updateRecord, "updatedAt") ||
      hasOwnSetting(updateRecord, "updated_at")
        ? updateRecord.updatedAt || updateRecord.updated_at || ""
        : normalized.updatedAt,
  });
}

function resolveMapSettingsLayers(
  settings: MapSettingsRecord = DEFAULT_MAP_SETTINGS,
) {
  const normalized = normalizeMapSettings(settings);
  const preset = getMapModePreset(getMapSettingsBaseMode(normalized));
  return {
    ...preset.layers,
    ...normalized.layerOverrides,
  };
}

export function buildPresetMapSettings({
  modeId,
  audioEnabled = false,
  now = new Date().toISOString(),
}: MapSettingsOptions = {}) {
  if (!isSelectableMapModeId(modeId)) {
    return normalizeMapSettings(DEFAULT_MAP_SETTINGS);
  }
  const preset = getMapModePreset(modeId);
  return {
    selectedMode: preset.id,
    baseMode: preset.id,
    layerOverrides: {},
    audioEnabled: audioEnabled === true,
    hasSelectedMode: true,
    updatedAt: now,
  };
}

export function buildCustomMapSettings({
  settings = DEFAULT_MAP_SETTINGS,
  layerKey,
  value,
  now = new Date().toISOString(),
}: MapSettingsOptions = {}) {
  const normalized = normalizeMapSettings(settings);
  if (!LAYER_KEY_SET.has(layerKey) || typeof value !== "boolean") {
    return normalized;
  }

  return {
    ...normalized,
    selectedMode: MAP_MODE_IDS.CUSTOM,
    baseMode: getMapSettingsBaseMode(normalized),
    layerOverrides: {
      ...normalized.layerOverrides,
      [layerKey]: value,
    },
    updatedAt: now,
  };
}

export function buildMapSettingsFromLayerState({
  settings = DEFAULT_MAP_SETTINGS,
  layers = {},
  now = new Date().toISOString(),
}: MapSettingsOptions = {}) {
  const normalized = normalizeMapSettings(settings);
  const baseMode = getMapSettingsBaseMode(normalized);
  const baseLayers = getMapModePreset(baseMode).layers;
  const layerOverrides = normalizeMapLayerOverrides(layers);
  const nextLayers = {
    ...resolveMapSettingsLayers(normalized),
    ...layerOverrides,
  };
  const custom = PERSISTED_MAP_LAYER_KEYS.some(
    (layerKey) => nextLayers[layerKey] !== baseLayers[layerKey],
  );

  return {
    ...normalized,
    selectedMode: custom ? MAP_MODE_IDS.CUSTOM : baseMode,
    baseMode,
    layerOverrides: custom ? normalizeMapLayerOverrides(nextLayers) : {},
    updatedAt: now,
  };
}

export function mapSettingsToExplorerLayers(
  settings: MapSettingsRecord = DEFAULT_MAP_SETTINGS,
) {
  const layers = resolveMapSettingsLayers(settings);
  return {
    showMapLabels: layers[MAP_LAYER_KEYS.MAP_LABELS],
    showRunwayBeams: layers[MAP_LAYER_KEYS.APPROACH_BEAMS],
    showNavaidMarkers: layers[MAP_LAYER_KEYS.NAVAID_MARKERS],
    showAirspaces: layers[MAP_LAYER_KEYS.AIRSPACES],
    showCandidateWatchingSpots: layers[MAP_LAYER_KEYS.CANDIDATE_WATCHING_SPOTS],
  };
}

export function mapSettingsToUserLocationPreferences(
  settings: MapSettingsRecord = DEFAULT_MAP_SETTINGS,
) {
  const layers = resolveMapSettingsLayers(settings);
  const enabled = layers[MAP_LAYER_KEYS.USER_LOCATION] === true;
  return {
    userLocationEnabled: enabled,
    userLocationAudioEnabled:
      enabled && layers[MAP_LAYER_KEYS.USER_LOCATION_AUDIO] === true,
  };
}

export function explorerLayerStateToMapSettingsLayers({
  showMapLabels,
  showRunwayBeams,
  showNavaidMarkers,
  showAirspaces,
  showCandidateWatchingSpots,
  userLocationActive,
  userLocationAudioActive,
}: MapSettingsOptions = {}) {
  return normalizeMapLayerOverrides({
    [MAP_LAYER_KEYS.MAP_LABELS]: showMapLabels,
    [MAP_LAYER_KEYS.APPROACH_BEAMS]: showRunwayBeams,
    [MAP_LAYER_KEYS.NAVAID_MARKERS]: showNavaidMarkers,
    [MAP_LAYER_KEYS.AIRSPACES]: showAirspaces,
    [MAP_LAYER_KEYS.CANDIDATE_WATCHING_SPOTS]: showCandidateWatchingSpots,
    [MAP_LAYER_KEYS.USER_LOCATION]: userLocationActive,
    [MAP_LAYER_KEYS.USER_LOCATION_AUDIO]: userLocationAudioActive,
  });
}
