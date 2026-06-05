import assert from "node:assert/strict";

import {
  MAP_LAYER_KEYS,
  MAP_MODE_IDS,
  buildCustomMapSettings,
  buildMapSettingsFromLayerState,
  buildPresetMapSettings,
  getSelectableMapModeOptions,
  mapSettingsToExplorerLayers,
  mergeMapSettings,
  normalizeMapSettings,
  resolveMapSettingsHydration,
} from "./mapSettingsModel";

{
  const spotting = buildPresetMapSettings({ modeId: MAP_MODE_IDS.SPOTTING });
  assert.equal(spotting.selectedMode, MAP_MODE_IDS.SPOTTING);
  assert.deepEqual(mapSettingsToExplorerLayers(spotting), {
    showMapLabels: true,
    showRunwayBeams: true,
    showNavaidMarkers: false,
    showAirspaces: false,
    showCandidateWatchingSpots: true,
  });
}

{
  const settings = normalizeMapSettings({
    selectedMode: MAP_MODE_IDS.CONTROLLER,
    layerOverrides: {
      [MAP_LAYER_KEYS.NAVAID_MARKERS]: false,
      unknownLayer: true,
    },
    updatedAt: "2026-06-02T15:00:00.000Z",
  });

  assert.equal(settings.selectedMode, MAP_MODE_IDS.CONTROLLER);
  assert.deepEqual(mapSettingsToExplorerLayers(settings), {
    showMapLabels: true,
    showRunwayBeams: true,
    showNavaidMarkers: false,
    showAirspaces: true,
    showCandidateWatchingSpots: false,
  });
  assert.deepEqual(settings.layerOverrides, {
    [MAP_LAYER_KEYS.NAVAID_MARKERS]: false,
  });
}

{
  const base = normalizeMapSettings({
    selectedMode: MAP_MODE_IDS.RADIO,
    layerOverrides: {},
    updatedAt: "2026-06-02T15:00:00.000Z",
  });
  const before = mapSettingsToExplorerLayers(base);
  const custom = buildCustomMapSettings({
    settings: base,
    layerKey: MAP_LAYER_KEYS.AIRSPACES,
    value: true,
    now: "2026-06-02T15:01:00.000Z",
  });

  assert.equal(custom.selectedMode, MAP_MODE_IDS.CUSTOM);
  assert.equal(custom.baseMode, MAP_MODE_IDS.RADIO);
  assert.equal(custom.layerOverrides[MAP_LAYER_KEYS.AIRSPACES], true);
  assert.equal(custom.updatedAt, "2026-06-02T15:01:00.000Z");
  assert.equal(before.showAirspaces, false);
}

{
  const defaults = normalizeMapSettings({});
  assert.equal(
    defaults.hasSelectedMode,
    false,
    "default settings should record that the user has not actively selected a mode",
  );

  const preset = buildPresetMapSettings({
    modeId: MAP_MODE_IDS.SPOTTING,
    now: "2026-06-02T15:02:00.000Z",
  });
  assert.equal(
    preset.hasSelectedMode,
    true,
    "selecting a preset should record that the user actively chose a mode",
  );

  const custom = buildCustomMapSettings({
    settings: defaults,
    layerKey: MAP_LAYER_KEYS.AIRSPACES,
    value: true,
    now: "2026-06-02T15:03:00.000Z",
  });
  assert.equal(
    custom.hasSelectedMode,
    false,
    "manual layer changes should preserve whether a mode was explicitly selected",
  );

  const restored = normalizeMapSettings({
    selectedMode: MAP_MODE_IDS.RADIO,
    has_selected_mode: true,
  });
  assert.equal(
    restored.hasSelectedMode,
    true,
    "database rows should hydrate has_selected_mode into the settings model",
  );
}

{
  const saved = buildMapSettingsFromLayerState({
    settings: buildPresetMapSettings({
      modeId: MAP_MODE_IDS.CONTROLLER,
      now: "2026-06-02T15:04:00.000Z",
    }),
    layers: {
      [MAP_LAYER_KEYS.MAP_LABELS]: false,
      [MAP_LAYER_KEYS.APPROACH_BEAMS]: true,
      [MAP_LAYER_KEYS.NAVAID_MARKERS]: true,
      [MAP_LAYER_KEYS.AIRSPACES]: true,
      [MAP_LAYER_KEYS.CANDIDATE_WATCHING_SPOTS]: true,
      [MAP_LAYER_KEYS.USER_LOCATION]: true,
      [MAP_LAYER_KEYS.USER_LOCATION_AUDIO]: false,
    },
    now: "2026-06-02T15:05:00.000Z",
  });

  assert.equal(
    saved.selectedMode,
    MAP_MODE_IDS.CUSTOM,
    "saving visible layer overrides should persist the setup as Custom",
  );
  assert.equal(saved.baseMode, MAP_MODE_IDS.CONTROLLER);
  assert.deepEqual(saved.layerOverrides, {
    [MAP_LAYER_KEYS.MAP_LABELS]: false,
    [MAP_LAYER_KEYS.APPROACH_BEAMS]: true,
    [MAP_LAYER_KEYS.NAVAID_MARKERS]: true,
    [MAP_LAYER_KEYS.AIRSPACES]: true,
    [MAP_LAYER_KEYS.CANDIDATE_WATCHING_SPOTS]: true,
    [MAP_LAYER_KEYS.USER_LOCATION]: true,
    [MAP_LAYER_KEYS.USER_LOCATION_AUDIO]: false,
  });
}

{
  assert.equal(
    getSelectableMapModeOptions().some(
      (mode) => mode.id === "immersive",
    ),
    false,
  );
}

{
  const legacyImmersive = buildPresetMapSettings({
    modeId: "immersive",
    now: "2026-06-02T15:08:00.000Z",
  });

  assert.equal(legacyImmersive.selectedMode, MAP_MODE_IDS.CONTROLLER);
  assert.deepEqual(
    mapSettingsToExplorerLayers(legacyImmersive),
    {
      showMapLabels: true,
      showRunwayBeams: true,
      showNavaidMarkers: false,
      showAirspaces: true,
      showCandidateWatchingSpots: false,
    },
  );
  const normalized = normalizeMapSettings(
    { selectedMode: "immersive", baseMode: "immersive" },
  );
  assert.equal(normalized.selectedMode, MAP_MODE_IDS.CONTROLLER);
  assert.equal(normalized.baseMode, MAP_MODE_IDS.CONTROLLER);
}

{
  const hydrated = resolveMapSettingsHydration({
    signedIn: true,
    userSettings: {
      selectedMode: MAP_MODE_IDS.RADIO,
      baseMode: MAP_MODE_IDS.RADIO,
      hasSelectedMode: true,
    },
    cachedSettings: {
      selectedMode: "immersive",
      baseMode: "immersive",
      hasSelectedMode: true,
    },
  });

  assert.equal(
    hydrated.source,
    "user",
    "signed-in hydration should prefer the account-backed settings",
  );
  assert.equal(hydrated.settings.selectedMode, MAP_MODE_IDS.RADIO);
}

{
  const hydrated = resolveMapSettingsHydration({
    signedIn: true,
    userSettings: null,
    cachedSettings: {
      selectedMode: "immersive",
      baseMode: "immersive",
      hasSelectedMode: true,
    },
  });

  assert.equal(
    hydrated.source,
    "cache",
    "signed-in hydration should only fall back to cache when no user settings exist",
  );
  assert.equal(hydrated.settings.selectedMode, MAP_MODE_IDS.CONTROLLER);
}

{
  const hydrated = resolveMapSettingsHydration({
    signedIn: false,
    userSettings: {
      selectedMode: MAP_MODE_IDS.RADIO,
      baseMode: MAP_MODE_IDS.RADIO,
      hasSelectedMode: true,
    },
    cachedSettings: {
      selectedMode: MAP_MODE_IDS.SPOTTING,
      baseMode: MAP_MODE_IDS.SPOTTING,
      hasSelectedMode: true,
    },
  });

  assert.equal(hydrated.source, "cache");
  assert.equal(hydrated.settings.selectedMode, MAP_MODE_IDS.SPOTTING);
}

{
  const merged = mergeMapSettings({
    settings: normalizeMapSettings({
      selectedMode: MAP_MODE_IDS.CUSTOM,
      baseMode: MAP_MODE_IDS.CONTROLLER,
      layerOverrides: {
        [MAP_LAYER_KEYS.AIRSPACES]: true,
        [MAP_LAYER_KEYS.USER_LOCATION]: true,
        [MAP_LAYER_KEYS.USER_LOCATION_AUDIO]: true,
      },
      hasSelectedMode: true,
      updatedAt: "2026-06-02T15:06:00.000Z",
    }),
    updates: {
      layerOverrides: {
        [MAP_LAYER_KEYS.MAP_LABELS]: false,
      },
      updatedAt: "2026-06-02T15:07:00.000Z",
    },
  });

  assert.equal(merged.selectedMode, MAP_MODE_IDS.CUSTOM);
  assert.equal(merged.baseMode, MAP_MODE_IDS.CONTROLLER);
  assert.equal(merged.hasSelectedMode, true);
  assert.equal(merged.updatedAt, "2026-06-02T15:07:00.000Z");
  assert.deepEqual(merged.layerOverrides, {
    [MAP_LAYER_KEYS.AIRSPACES]: true,
    [MAP_LAYER_KEYS.USER_LOCATION]: true,
    [MAP_LAYER_KEYS.USER_LOCATION_AUDIO]: true,
    [MAP_LAYER_KEYS.MAP_LABELS]: false,
  });
}

console.log("mapSettingsModel.test.ts ok");
