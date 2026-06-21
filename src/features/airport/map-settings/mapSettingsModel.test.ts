import assert from "node:assert/strict";

import {
  DEFAULT_MAP_SETTINGS,
  MAP_LAYER_KEYS,
  MAP_MODE_IDS,
  buildCustomMapSettings,
  buildMapSettingsFromLayerState,
  getAlternateMapSettingsDevice,
  mapSettingsToExplorerLayers,
  mergeMapSettings,
  normalizeMapSettings,
  normalizeMapSettingsDevice,
  resolveMapSettingsDeviceForClientDeviceProfile,
  resolveMapSettingsHydrationCommit,
  resolveMapSettingsHydration,
  resolveMapSettingsPersistenceTargets,
  serializeMapSettingsPersistenceSignature,
} from "./mapSettingsModel";

{
  assert.equal(normalizeMapSettingsDevice("mobile"), "mobile");
  assert.equal(normalizeMapSettingsDevice("desktop"), "desktop");
  assert.equal(normalizeMapSettingsDevice("tablet"), "desktop");
  assert.equal(getAlternateMapSettingsDevice("mobile"), "desktop");
  assert.equal(getAlternateMapSettingsDevice("desktop"), "mobile");
}

{
  assert.equal(
    resolveMapSettingsDeviceForClientDeviceProfile({
      deviceClass: "phone",
    }),
    "mobile",
    "phone landscape should still use mobile map settings",
  );
  assert.equal(
    resolveMapSettingsDeviceForClientDeviceProfile({
      deviceClass: "tablet",
    }),
    "mobile",
    "tablet layout may be desktop-width, but map settings stay mobile-class",
  );
  assert.equal(
    resolveMapSettingsDeviceForClientDeviceProfile({
      deviceClass: "desktop",
    }),
    "desktop",
    "desktop systems should keep desktop map settings",
  );
}

{
  // normalizeMapSettings defaults to CUSTOM for unknown modes
  const settings = normalizeMapSettings({
    selectedMode: "spotting",
    layerOverrides: {
      [MAP_LAYER_KEYS.NAVAID_MARKERS]: false,
      unknownLayer: true,
    },
    updatedAt: "2026-06-02T15:00:00.000Z",
  });

  assert.equal(settings.selectedMode, "spotting");
  assert.equal(settings.baseMode, MAP_MODE_IDS.CUSTOM);
  // With no preset, layers come from defaults + overrides
  assert.deepEqual(mapSettingsToExplorerLayers(settings), {
    showMapLabels: true,
    showRunwayBeams: false,
    showNavaidMarkers: false,
    showReportingPoints: false,
    showAirspaces: false,
    showCandidateWatchingSpots: false,
    showCallsigns: true,
  });
  assert.deepEqual(settings.layerOverrides, {
    [MAP_LAYER_KEYS.NAVAID_MARKERS]: false,
  });
}

{
  // buildCustomMapSettings always sets baseMode to CUSTOM
  const base = normalizeMapSettings({
    layerOverrides: {},
    updatedAt: "2026-06-02T15:00:00.000Z",
  });
  const custom = buildCustomMapSettings({
    settings: base,
    layerKey: MAP_LAYER_KEYS.AIRSPACES,
    value: true,
    now: "2026-06-02T15:01:00.000Z",
  });

  assert.equal(custom.selectedMode, MAP_MODE_IDS.CUSTOM);
  assert.equal(custom.baseMode, MAP_MODE_IDS.CUSTOM);
  assert.equal(custom.layerOverrides[MAP_LAYER_KEYS.AIRSPACES], true);
  assert.equal(custom.updatedAt, "2026-06-02T15:01:00.000Z");
}

{
  // hasSelectedMode still hydrates correctly
  const defaults = normalizeMapSettings({});
  assert.equal(
    defaults.hasSelectedMode,
    false,
    "default settings should record that the user has not actively selected a mode",
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
    selectedMode: MAP_MODE_IDS.CUSTOM,
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
    settings: normalizeMapSettings({}),
    layers: {
      [MAP_LAYER_KEYS.MAP_LABELS]: false,
      [MAP_LAYER_KEYS.APPROACH_BEAMS]: true,
      [MAP_LAYER_KEYS.NAVAID_MARKERS]: true,
      [MAP_LAYER_KEYS.REPORTING_POINTS]: true,
      [MAP_LAYER_KEYS.AIRSPACES]: true,
      [MAP_LAYER_KEYS.CANDIDATE_WATCHING_SPOTS]: true,
      [MAP_LAYER_KEYS.USER_LOCATION]: true,
    },
    now: "2026-06-02T15:05:00.000Z",
  });

  assert.equal(
    saved.selectedMode,
    MAP_MODE_IDS.CUSTOM,
    "saving visible layer overrides should persist the setup as Custom",
  );
  assert.equal(saved.baseMode, MAP_MODE_IDS.CUSTOM);
  assert.deepEqual(saved.layerOverrides, {
    [MAP_LAYER_KEYS.MAP_LABELS]: false,
    [MAP_LAYER_KEYS.APPROACH_BEAMS]: true,
    [MAP_LAYER_KEYS.NAVAID_MARKERS]: true,
    [MAP_LAYER_KEYS.REPORTING_POINTS]: true,
    [MAP_LAYER_KEYS.AIRSPACES]: true,
    [MAP_LAYER_KEYS.CANDIDATE_WATCHING_SPOTS]: true,
    [MAP_LAYER_KEYS.SHOW_CALLSIGNS]: true,
    [MAP_LAYER_KEYS.USER_LOCATION]: true,
  });
}

{
  // Legacy "immersive" mode gracefully degrades to CUSTOM defaults
  const normalized = normalizeMapSettings(
    { selectedMode: "immersive", baseMode: "immersive" },
  );
  assert.equal(normalized.selectedMode, MAP_MODE_IDS.CUSTOM);
  assert.equal(normalized.baseMode, MAP_MODE_IDS.CUSTOM);
  assert.deepEqual(
    mapSettingsToExplorerLayers(normalized),
    {
      showMapLabels: true,
      showRunwayBeams: false,
      showNavaidMarkers: false,
      showReportingPoints: false,
      showAirspaces: false,
      showCandidateWatchingSpots: false,
      showCallsigns: true,
    },
  );
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
  assert.equal(hydrated.settings.selectedMode, MAP_MODE_IDS.CUSTOM);
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
      selectedMode: MAP_MODE_IDS.CUSTOM,
      baseMode: MAP_MODE_IDS.CUSTOM,
      hasSelectedMode: true,
    },
  });

  assert.equal(hydrated.source, "cache");
  assert.equal(hydrated.settings.selectedMode, MAP_MODE_IDS.CUSTOM);
}

{
  assert.deepEqual(
    resolveMapSettingsPersistenceTargets({
      authLoaded: false,
      signedIn: false,
    }),
    {
      readCache: true,
      readDatabase: false,
      writeCache: true,
      writeDatabase: false,
    },
    "pending auth should still rely on the local cache",
  );
  assert.deepEqual(
    resolveMapSettingsPersistenceTargets({
      authLoaded: true,
      signedIn: true,
    }),
    {
      readCache: true,
      readDatabase: true,
      writeCache: true,
      writeDatabase: true,
    },
    "signed-in settings should use both cache and database",
  );
  assert.deepEqual(
    resolveMapSettingsPersistenceTargets({
      authLoaded: true,
      signedIn: false,
    }),
    {
      readCache: true,
      readDatabase: false,
      writeCache: true,
      writeDatabase: false,
    },
    "guest settings should only use the local cache",
  );
}

{
  const pending = resolveMapSettingsHydrationCommit({
    pendingSettings: {
      selectedMode: MAP_MODE_IDS.RADIO,
      baseMode: MAP_MODE_IDS.RADIO,
      hasSelectedMode: true,
    },
    currentSettings: DEFAULT_MAP_SETTINGS,
  });

  assert.equal(
    pending.pending,
    true,
    "settings persistence should pause while cache hydration is still pending in state",
  );
  assert.equal(pending.committed, false);

  const committed = resolveMapSettingsHydrationCommit({
    pendingSettings: {
      selectedMode: MAP_MODE_IDS.RADIO,
      baseMode: MAP_MODE_IDS.RADIO,
      hasSelectedMode: true,
    },
    currentSettings: {
      selectedMode: MAP_MODE_IDS.RADIO,
      baseMode: MAP_MODE_IDS.RADIO,
      hasSelectedMode: true,
    },
  });

  assert.equal(committed.pending, false);
  assert.equal(
    committed.committed,
    true,
    "settings hydration should commit once state matches the pending settings",
  );
}

{
  const merged = mergeMapSettings({
    settings: normalizeMapSettings({
      selectedMode: MAP_MODE_IDS.CUSTOM,
      baseMode: MAP_MODE_IDS.CONTROLLER,
      layerOverrides: {
        [MAP_LAYER_KEYS.AIRSPACES]: true,
        [MAP_LAYER_KEYS.USER_LOCATION]: true,
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
  assert.equal(merged.baseMode, MAP_MODE_IDS.CUSTOM);
  assert.equal(merged.hasSelectedMode, true);
  assert.equal(merged.updatedAt, "2026-06-02T15:07:00.000Z");
  assert.deepEqual(merged.layerOverrides, {
    [MAP_LAYER_KEYS.AIRSPACES]: true,
    [MAP_LAYER_KEYS.USER_LOCATION]: true,
    [MAP_LAYER_KEYS.MAP_LABELS]: false,
  });
}

{
  const first = serializeMapSettingsPersistenceSignature({
    selectedMode: MAP_MODE_IDS.CUSTOM,
    baseMode: MAP_MODE_IDS.CUSTOM,
    layerOverrides: {
      [MAP_LAYER_KEYS.MAP_LABELS]: false,
    },
    baseLayer: "standard",
    hasSelectedMode: true,
    updatedAt: "2026-06-02T15:08:00.000Z",
  });
  const timestampOnlyChange = serializeMapSettingsPersistenceSignature({
    selectedMode: MAP_MODE_IDS.CUSTOM,
    baseMode: MAP_MODE_IDS.CUSTOM,
    layerOverrides: {
      [MAP_LAYER_KEYS.MAP_LABELS]: false,
    },
    baseLayer: "standard",
    hasSelectedMode: true,
    updatedAt: "2026-06-02T15:09:00.000Z",
  });
  const layerChange = serializeMapSettingsPersistenceSignature({
    selectedMode: MAP_MODE_IDS.CUSTOM,
    baseMode: MAP_MODE_IDS.CUSTOM,
    layerOverrides: {
      [MAP_LAYER_KEYS.MAP_LABELS]: true,
    },
    baseLayer: "standard",
    hasSelectedMode: true,
    updatedAt: "2026-06-02T15:09:00.000Z",
  });

  assert.equal(
    first,
    timestampOnlyChange,
    "server timestamp changes should not mark map settings dirty again",
  );
  assert.notEqual(
    first,
    layerChange,
    "real layer changes should still mark map settings dirty",
  );
}

console.log("mapSettingsModel.test.ts ok");
