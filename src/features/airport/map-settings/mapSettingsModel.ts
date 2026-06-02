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
  USER_LOCATION: "userLocation",
  USER_LOCATION_AUDIO: "userLocationAudio",
});

export const PERSISTED_MAP_LAYER_KEYS = Object.freeze([
  MAP_LAYER_KEYS.MAP_LABELS,
  MAP_LAYER_KEYS.APPROACH_BEAMS,
  MAP_LAYER_KEYS.NAVAID_MARKERS,
  MAP_LAYER_KEYS.AIRSPACES,
  MAP_LAYER_KEYS.USER_LOCATION,
  MAP_LAYER_KEYS.USER_LOCATION_AUDIO,
]);

export const DISPLAY_MAP_LAYER_KEYS = Object.freeze([
  MAP_LAYER_KEYS.MAP_LABELS,
  MAP_LAYER_KEYS.APPROACH_BEAMS,
  MAP_LAYER_KEYS.NAVAID_MARKERS,
  MAP_LAYER_KEYS.AIRSPACES,
]);

const MAP_MODE_PRESETS = Object.freeze({
  [MAP_MODE_IDS.SPOTTING]: Object.freeze({
    id: MAP_MODE_IDS.SPOTTING,
    labelKey: "mapSettings.modes.spotting",
    descriptionKey: "mapSettings.modeDescriptions.spotting",
    iconKey: "planeLanding",
    layers: Object.freeze({
      [MAP_LAYER_KEYS.MAP_LABELS]: true,
      [MAP_LAYER_KEYS.APPROACH_BEAMS]: true,
      [MAP_LAYER_KEYS.NAVAID_MARKERS]: false,
      [MAP_LAYER_KEYS.AIRSPACES]: false,
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

export const DISABLED_MAP_MODE_IDS = Object.freeze([
  MAP_MODE_IDS.IMMERSIVE,
]);

export const DEFAULT_MAP_SETTINGS: MapSettingsRecord = Object.freeze({
  selectedMode: MAP_MODE_IDS.CONTROLLER,
  baseMode: MAP_MODE_IDS.CONTROLLER,
  layerOverrides: Object.freeze({}),
  audioEnabled: false,
  updatedAt: "",
});

const MAP_MODE_ID_SET: Set<string> = new Set(Object.values(MAP_MODE_IDS));
const PRESET_MODE_ID_SET: Set<string> = new Set(MAP_MODE_OPTIONS.map((mode) => mode.id));
const LAYER_KEY_SET: Set<string> = new Set(PERSISTED_MAP_LAYER_KEYS);
const DISABLED_MAP_MODE_ID_SET: Set<string> = new Set(DISABLED_MAP_MODE_IDS);

export function getMapModePreset(modeId) {
  return MAP_MODE_PRESETS[modeId] || MAP_MODE_PRESETS[DEFAULT_MAP_SETTINGS.baseMode];
}

export function isMapModeId(value) {
  return MAP_MODE_ID_SET.has(value);
}

export function isPresetMapModeId(value) {
  return PRESET_MODE_ID_SET.has(value);
}

export function isSelectableMapModeId(value) {
  return isPresetMapModeId(value) && !DISABLED_MAP_MODE_ID_SET.has(value);
}

export function getMapSettingsBaseMode(settings: MapSettingsRecord = {}) {
  const selectedMode = settings?.selectedMode;
  const baseMode = settings?.baseMode;
  if (isPresetMapModeId(selectedMode)) return selectedMode;
  if (isPresetMapModeId(baseMode)) return baseMode;
  return DEFAULT_MAP_SETTINGS.baseMode;
}

export function normalizeMapLayerOverrides(layerOverrides: unknown) {
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

export function normalizeMapSettings(settings: MapSettingsRecord = {}) {
  const selectedMode = isMapModeId(settings?.selectedMode)
    ? settings.selectedMode
    : DEFAULT_MAP_SETTINGS.selectedMode;
  const baseMode = isPresetMapModeId(settings?.baseMode)
    ? settings.baseMode
    : isPresetMapModeId(selectedMode)
      ? selectedMode
      : DEFAULT_MAP_SETTINGS.baseMode;

  return {
    selectedMode,
    baseMode,
    layerOverrides: normalizeMapLayerOverrides(settings?.layerOverrides),
    audioEnabled: settings?.audioEnabled === true,
    updatedAt: String(settings?.updatedAt || settings?.updated_at || ""),
  };
}

export function resolveMapSettingsLayers(settings: MapSettingsRecord = DEFAULT_MAP_SETTINGS) {
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
  return {
    ...normalized,
    layerOverrides: normalizeMapLayerOverrides(layers),
    updatedAt: now,
  };
}

export function mapSettingsToExplorerLayers(settings: MapSettingsRecord = DEFAULT_MAP_SETTINGS) {
  const layers = resolveMapSettingsLayers(settings);
  return {
    showMapLabels: layers[MAP_LAYER_KEYS.MAP_LABELS],
    showRunwayBeams: layers[MAP_LAYER_KEYS.APPROACH_BEAMS],
    showNavaidMarkers: layers[MAP_LAYER_KEYS.NAVAID_MARKERS],
    showAirspaces: layers[MAP_LAYER_KEYS.AIRSPACES],
  };
}

export function explorerLayerStateToMapSettingsLayers({
  showMapLabels,
  showRunwayBeams,
  showNavaidMarkers,
  showAirspaces,
  userLocationActive,
  userLocationAudioActive,
}: MapSettingsOptions = {}) {
  return normalizeMapLayerOverrides({
    [MAP_LAYER_KEYS.MAP_LABELS]: showMapLabels,
    [MAP_LAYER_KEYS.APPROACH_BEAMS]: showRunwayBeams,
    [MAP_LAYER_KEYS.NAVAID_MARKERS]: showNavaidMarkers,
    [MAP_LAYER_KEYS.AIRSPACES]: showAirspaces,
    [MAP_LAYER_KEYS.USER_LOCATION]: userLocationActive,
    [MAP_LAYER_KEYS.USER_LOCATION_AUDIO]: userLocationAudioActive,
  });
}
