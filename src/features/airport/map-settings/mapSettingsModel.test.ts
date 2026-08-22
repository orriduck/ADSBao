import assert from "node:assert/strict";

import {
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
  resolveStoredMapSettings,
  serializeMapSettingsPersistenceSignature,
} from "./mapSettingsModel";
import { MAP_LABEL_LEVEL_IDS } from "../map/mapLabelLevelModel";

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
  // Explicit stored overrides preserve a prior local setup.
  assert.deepEqual(mapSettingsToExplorerLayers(settings), {
    mapLabelLevel: MAP_LABEL_LEVEL_IDS.OFF,
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
      [MAP_LAYER_KEYS.MAP_LABELS]: MAP_LABEL_LEVEL_IDS.MAJOR_CITIES,
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
    [MAP_LAYER_KEYS.MAP_LABELS]: MAP_LABEL_LEVEL_IDS.MAJOR_CITIES,
    [MAP_LAYER_KEYS.APPROACH_BEAMS]: true,
    [MAP_LAYER_KEYS.NAVAID_MARKERS]: true,
    [MAP_LAYER_KEYS.REPORTING_POINTS]: true,
    [MAP_LAYER_KEYS.AIRSPACES]: true,
    [MAP_LAYER_KEYS.CANDIDATE_WATCHING_SPOTS]: true,
    [MAP_LAYER_KEYS.SHOW_CALLSIGNS]: false,
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
      mapLabelLevel: MAP_LABEL_LEVEL_IDS.OFF,
      showRunwayBeams: true,
      showNavaidMarkers: false,
      showReportingPoints: false,
      showAirspaces: false,
      showCandidateWatchingSpots: true,
      showCallsigns: false,
    },
  );
}

{
  const stored = resolveStoredMapSettings({
    selectedMode: MAP_MODE_IDS.CUSTOM,
    layerOverrides: {
      [MAP_LAYER_KEYS.AIRSPACES]: true,
    },
  });
  assert.equal(stored.source, "local");
  assert.equal(stored.settings.layerOverrides[MAP_LAYER_KEYS.AIRSPACES], true);

  const defaults = resolveStoredMapSettings();
  assert.equal(defaults.source, "default");
  assert.deepEqual(mapSettingsToExplorerLayers(defaults.settings), {
    mapLabelLevel: MAP_LABEL_LEVEL_IDS.OFF,
    showRunwayBeams: true,
    showNavaidMarkers: false,
    showReportingPoints: false,
    showAirspaces: false,
    showCandidateWatchingSpots: true,
    showCallsigns: false,
  });
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
        [MAP_LAYER_KEYS.MAP_LABELS]: MAP_LABEL_LEVEL_IDS.MAJOR_HIGHWAYS,
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
    [MAP_LAYER_KEYS.MAP_LABELS]: MAP_LABEL_LEVEL_IDS.MAJOR_HIGHWAYS,
  });
}

{
  const first = serializeMapSettingsPersistenceSignature({
    selectedMode: MAP_MODE_IDS.CUSTOM,
    baseMode: MAP_MODE_IDS.CUSTOM,
    layerOverrides: {
      [MAP_LAYER_KEYS.MAP_LABELS]: MAP_LABEL_LEVEL_IDS.MAJOR_HIGHWAYS,
    },
    baseLayer: "standard",
    hasSelectedMode: true,
    updatedAt: "2026-06-02T15:08:00.000Z",
  });
  const timestampOnlyChange = serializeMapSettingsPersistenceSignature({
    selectedMode: MAP_MODE_IDS.CUSTOM,
    baseMode: MAP_MODE_IDS.CUSTOM,
    layerOverrides: {
      [MAP_LAYER_KEYS.MAP_LABELS]: MAP_LABEL_LEVEL_IDS.MAJOR_HIGHWAYS,
    },
    baseLayer: "standard",
    hasSelectedMode: true,
    updatedAt: "2026-06-02T15:09:00.000Z",
  });
  const layerChange = serializeMapSettingsPersistenceSignature({
    selectedMode: MAP_MODE_IDS.CUSTOM,
    baseMode: MAP_MODE_IDS.CUSTOM,
    layerOverrides: {
      [MAP_LAYER_KEYS.MAP_LABELS]: MAP_LABEL_LEVEL_IDS.ALL,
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
