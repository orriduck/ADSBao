type MapSettingsRecord = Record<string, any>;
type MapSettingsOptions = Record<string, any>;

export const MAP_MODE_IDS = Object.freeze({
  SPOTTING: "spotting",
  RADIO: "radio",
  CONTROLLER: "controller",
  CUSTOM: "custom",
});

export const MAP_LAYER_KEYS = Object.freeze({
  MAP_LABELS: "mapLabels",
  APPROACH_BEAMS: "approachBeams",
  NAVAID_MARKERS: "navaidMarkers",
  REPORTING_POINTS: "reportingPoints",
  AIRSPACES: "airspaces",
  CANDIDATE_WATCHING_SPOTS: "candidateWatchingSpots",
  SHOW_CALLSIGNS: "showCallsigns",
  USER_LOCATION: "userLocation",
});

const PERSISTED_MAP_LAYER_KEYS = Object.freeze([
  MAP_LAYER_KEYS.MAP_LABELS,
  MAP_LAYER_KEYS.APPROACH_BEAMS,
  MAP_LAYER_KEYS.NAVAID_MARKERS,
  MAP_LAYER_KEYS.REPORTING_POINTS,
  MAP_LAYER_KEYS.AIRSPACES,
  MAP_LAYER_KEYS.CANDIDATE_WATCHING_SPOTS,
  MAP_LAYER_KEYS.SHOW_CALLSIGNS,
  MAP_LAYER_KEYS.USER_LOCATION,
]);


const DISABLED_MAP_MODE_IDS = Object.freeze([]);

// Base map vector style the map renders underneath every other layer.
// `terrain` keeps the current readable-topo treatment (hillshade +
// muted palette) so existing users see no change unless they switch.
// A `transport`-themed style was considered but every free option
// either drops multilingual label support (raster tiles like
// ÖPNVKarte bake local-language labels) or requires an API key
// (Thunderforest, MapTiler) — left for a follow-up once we decide
// which provider to take on.
const MAP_BASE_LAYER_IDS = Object.freeze({
  STANDARD: "standard",
  TERRAIN: "terrain",
});

export const DEFAULT_MAP_BASE_LAYER = MAP_BASE_LAYER_IDS.STANDARD;

const MAP_BASE_LAYER_OPTIONS = [
  {
    id: MAP_BASE_LAYER_IDS.STANDARD,
    labelKey: "mapSettings.baseLayers.standard",
    descriptionKey: "mapSettings.baseLayerDescriptions.standard",
    iconKey: "map",
  },
  {
    id: MAP_BASE_LAYER_IDS.TERRAIN,
    labelKey: "mapSettings.baseLayers.terrain",
    descriptionKey: "mapSettings.baseLayerDescriptions.terrain",
    iconKey: "mountain",
  },
] as const;

const MAP_BASE_LAYER_ID_SET: Set<string> = new Set(
  Object.values(MAP_BASE_LAYER_IDS),
);

export function isKnownMapBaseLayer(value: unknown) {
  return typeof value === "string" && MAP_BASE_LAYER_ID_SET.has(value);
}

export function normalizeMapBaseLayer(value: unknown) {
  return isKnownMapBaseLayer(value)
    ? (value as string)
    : DEFAULT_MAP_BASE_LAYER;
}

export function getMapBaseLayerOptions() {
  return MAP_BASE_LAYER_OPTIONS;
}

// Whether the whole ambient system — map wash, aircraft weather/time tint +
// light-mask colour, sidebar panel, and floating toolbar — follows the
// static pre-ambient theme, or picks up the airport's current weather and
// local time of day (see aircraftAmbientModel.ts's resolvers). One switch
// for all of it, so the map never ends up in an inconsistent state (e.g. a
// tinted map with plain aircraft).
const AMBIENT_MODE_IDS = Object.freeze({
  THEME: "theme",
  AMBIENT: "ambient",
});

export const DEFAULT_AMBIENT_MODE = AMBIENT_MODE_IDS.AMBIENT;

const AMBIENT_MODE_OPTIONS = [
  {
    id: AMBIENT_MODE_IDS.AMBIENT,
    labelKey: "mapSettings.ambient.ambient",
    descriptionKey: "mapSettings.ambientDescriptions.ambient",
    iconKey: "sunMoon",
  },
  {
    id: AMBIENT_MODE_IDS.THEME,
    labelKey: "mapSettings.ambient.theme",
    descriptionKey: "mapSettings.ambientDescriptions.theme",
    iconKey: "palette",
  },
] as const;

const AMBIENT_MODE_ID_SET: Set<string> = new Set(
  Object.values(AMBIENT_MODE_IDS),
);

export function isKnownAmbientMode(value: unknown) {
  return typeof value === "string" && AMBIENT_MODE_ID_SET.has(value);
}

export function normalizeAmbientMode(value: unknown) {
  return isKnownAmbientMode(value)
    ? (value as string)
    : DEFAULT_AMBIENT_MODE;
}

export function getAmbientModeOptions() {
  return AMBIENT_MODE_OPTIONS;
}

export const DEFAULT_MAP_SETTINGS: MapSettingsRecord = Object.freeze({
  selectedMode: MAP_MODE_IDS.CUSTOM,
  baseMode: MAP_MODE_IDS.CUSTOM,
  layerOverrides: Object.freeze({}),
  baseLayer: DEFAULT_MAP_BASE_LAYER,
  ambientMode: DEFAULT_AMBIENT_MODE,
  audioEnabled: false,
  hasSelectedMode: false,
  updatedAt: "",
});

// Pre-hydration visual defaults — what the map renders before
// Clerk / map-settings hydration completes. Labels are OFF and
// other overlays are minimised to reduce visual noise and avoid
// ON→OFF flicker when saved settings turn out to differ.
// Once mapSettingsHydrated flips to true, the real saved/cached
// settings replace these temporarily-safe visual fallbacks.
export const PRE_HYDRATION_VISUAL_LAYERS = Object.freeze({
  showMapLabels: false,
  showRunwayBeams: false,
  showNavaidMarkers: false,
  showReportingPoints: false,
  showAirspaces: false,
  showCandidateWatchingSpots: false,
  showCallsigns: false,
});

const MAP_SETTINGS_DEVICE_TYPES = Object.freeze({
  DESKTOP: "desktop",
  MOBILE: "mobile",
});

export const DEFAULT_MAP_SETTINGS_DEVICE = MAP_SETTINGS_DEVICE_TYPES.DESKTOP;

const MAP_MODE_ID_SET: Set<string> = new Set(Object.values(MAP_MODE_IDS));
const LAYER_KEY_SET: Set<string> = new Set(PERSISTED_MAP_LAYER_KEYS);
const DISABLED_MAP_MODE_ID_SET: Set<string> = new Set(DISABLED_MAP_MODE_IDS);
const MAP_SETTINGS_DEVICE_SET: Set<string> = new Set(
  Object.values(MAP_SETTINGS_DEVICE_TYPES),
);

function isMapModeId(value) {
  return MAP_MODE_ID_SET.has(value);
}

export function isSelectableMapModeId(_value: unknown) {
  return false;
}

export function normalizeMapSettingsDevice(value: unknown) {
  const device = String(value || "").trim().toLowerCase();
  return MAP_SETTINGS_DEVICE_SET.has(device)
    ? device
    : DEFAULT_MAP_SETTINGS_DEVICE;
}

export function getAlternateMapSettingsDevice(value: unknown) {
  return normalizeMapSettingsDevice(value) === MAP_SETTINGS_DEVICE_TYPES.MOBILE
    ? MAP_SETTINGS_DEVICE_TYPES.DESKTOP
    : MAP_SETTINGS_DEVICE_TYPES.MOBILE;
}

export function resolveMapSettingsDeviceForClientDeviceProfile(
  profile: { deviceClass?: unknown } | null | undefined,
) {
  const deviceClass = String(profile?.deviceClass || "");
  return deviceClass === "phone" || deviceClass === "tablet"
    ? MAP_SETTINGS_DEVICE_TYPES.MOBILE
    : MAP_SETTINGS_DEVICE_TYPES.DESKTOP;
}

function getMapSettingsBaseMode(
  _settings: MapSettingsRecord = {},
) {
  return MAP_MODE_IDS.CUSTOM;
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
    baseLayer: normalizeMapBaseLayer(settings?.baseLayer ?? settings?.base_layer),
    ambientMode: normalizeAmbientMode(
      settings?.ambientMode ?? settings?.ambient_mode,
    ),
    audioEnabled: settings?.audioEnabled === true,
    hasSelectedMode:
      settings?.hasSelectedMode === true || settings?.has_selected_mode === true,
    updatedAt: String(settings?.updatedAt || settings?.updated_at || ""),
  };
}

export function serializeMapSettingsPersistenceSignature(
  settings: MapSettingsRecord = DEFAULT_MAP_SETTINGS,
) {
  const normalized = normalizeMapSettings(settings);
  const { updatedAt: _updatedAt, ...semanticSettings } = normalized;
  return JSON.stringify(semanticSettings);
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

export function resolveMapSettingsPersistenceTargets({
  authLoaded = false,
  signedIn = false,
}: MapSettingsOptions = {}) {
  const hasSignedInUser = authLoaded === true && signedIn === true;
  return {
    readCache: true,
    readDatabase: hasSignedInUser,
    writeCache: true,
    writeDatabase: hasSignedInUser,
  };
}

export function resolveMapSettingsHydrationCommit({
  pendingSettings = null,
  currentSettings = DEFAULT_MAP_SETTINGS,
}: MapSettingsOptions = {}) {
  if (!pendingSettings) {
    return { pending: false, committed: false, serialized: "" };
  }

  const pendingSerialized = JSON.stringify(normalizeMapSettings(pendingSettings));
  const currentSerialized = JSON.stringify(normalizeMapSettings(currentSettings));
  const committed = pendingSerialized === currentSerialized;

  return {
    pending: !committed,
    committed,
    serialized: pendingSerialized,
  };
}

// Account-backed settings hydrate asynchronously. If the user changes a
// setting while that request is in flight, its older response must not replace
// the newer in-memory choice.
export function shouldCommitMapSettingsHydration({
  requestVersion = 0,
  currentVersion = 0,
  hasUserMutation = false,
}: MapSettingsOptions = {}) {
  return hasUserMutation !== true && requestVersion === currentVersion;
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
  const baseMode = MAP_MODE_IDS.CUSTOM;

  return normalizeMapSettings({
    selectedMode,
    baseMode,
    layerOverrides: nextLayerOverrides,
    baseLayer:
      hasOwnSetting(updateRecord, "baseLayer") ||
      hasOwnSetting(updateRecord, "base_layer")
        ? normalizeMapBaseLayer(
            updateRecord.baseLayer ?? updateRecord.base_layer,
          )
        : normalized.baseLayer,
    ambientMode:
      hasOwnSetting(updateRecord, "ambientMode") ||
      hasOwnSetting(updateRecord, "ambient_mode")
        ? normalizeAmbientMode(
            updateRecord.ambientMode ?? updateRecord.ambient_mode,
          )
        : normalized.ambientMode,
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

// Build a settings record with a swapped base layer, preserving the
// rest of the user's selections. Used by the Base map switcher in the
// settings sheet.
export function buildMapSettingsWithBaseLayer({
  settings = DEFAULT_MAP_SETTINGS,
  baseLayer = DEFAULT_MAP_BASE_LAYER,
  now = new Date().toISOString(),
}: MapSettingsOptions = {}) {
  return mergeMapSettings({
    settings,
    updates: { baseLayer: normalizeMapBaseLayer(baseLayer), updatedAt: now },
  });
}

// Build a settings record with a swapped chrome ambient mode, preserving the
// rest of the user's selections. Used by the Ambient chrome switcher in the
// settings sheet.
export function buildMapSettingsWithAmbientMode({
  settings = DEFAULT_MAP_SETTINGS,
  ambientMode = DEFAULT_AMBIENT_MODE,
  now = new Date().toISOString(),
}: MapSettingsOptions = {}) {
  return mergeMapSettings({
    settings,
    updates: {
      ambientMode: normalizeAmbientMode(ambientMode),
      updatedAt: now,
    },
  });
}

function resolveMapSettingsLayers(
  settings: MapSettingsRecord = DEFAULT_MAP_SETTINGS,
) {
  const normalized = normalizeMapSettings(settings);
  return {
    [MAP_LAYER_KEYS.MAP_LABELS]: true,
    [MAP_LAYER_KEYS.APPROACH_BEAMS]: false,
    [MAP_LAYER_KEYS.NAVAID_MARKERS]: false,
    [MAP_LAYER_KEYS.REPORTING_POINTS]: false,
    [MAP_LAYER_KEYS.AIRSPACES]: false,
    [MAP_LAYER_KEYS.CANDIDATE_WATCHING_SPOTS]: false,
    [MAP_LAYER_KEYS.SHOW_CALLSIGNS]: true,
    [MAP_LAYER_KEYS.USER_LOCATION]: false,
    ...normalized.layerOverrides,
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
    baseMode: MAP_MODE_IDS.CUSTOM,
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
  const layerOverrides = normalizeMapLayerOverrides(layers);
  const nextLayers = {
    ...resolveMapSettingsLayers(normalized),
    ...layerOverrides,
  };

  return {
    ...normalized,
    selectedMode: MAP_MODE_IDS.CUSTOM,
    baseMode: MAP_MODE_IDS.CUSTOM,
    layerOverrides: normalizeMapLayerOverrides(nextLayers),
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
    showReportingPoints: layers[MAP_LAYER_KEYS.REPORTING_POINTS],
    showAirspaces: layers[MAP_LAYER_KEYS.AIRSPACES],
    showCandidateWatchingSpots: layers[MAP_LAYER_KEYS.CANDIDATE_WATCHING_SPOTS],
    showCallsigns: layers[MAP_LAYER_KEYS.SHOW_CALLSIGNS],
  };
}

export function mapSettingsToUserLocationPreferences(
  settings: MapSettingsRecord = DEFAULT_MAP_SETTINGS,
) {
  const layers = resolveMapSettingsLayers(settings);
  const enabled = layers[MAP_LAYER_KEYS.USER_LOCATION] === true;
  return {
    userLocationEnabled: enabled,
  };
}
