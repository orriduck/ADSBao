import assert from "node:assert/strict";

import {
  MAP_LAYER_KEYS,
  MAP_MODE_IDS,
  buildCustomMapSettings,
  buildMapSettingsFromLayerState,
  buildPresetMapSettings,
  getMapModePreset,
  normalizeMapSettings,
  resolveMapSettingsLayers,
} from "./mapSettingsModel";

{
  const spotting = getMapModePreset(MAP_MODE_IDS.SPOTTING);
  assert.equal(spotting.id, MAP_MODE_IDS.SPOTTING);
  assert.equal(spotting.layers[MAP_LAYER_KEYS.MAP_LABELS], true);
  assert.equal(spotting.layers[MAP_LAYER_KEYS.APPROACH_BEAMS], true);
  assert.equal(spotting.layers[MAP_LAYER_KEYS.CANDIDATE_WATCHING_SPOTS], true);
  assert.equal(spotting.layers[MAP_LAYER_KEYS.NAVAID_MARKERS], false);
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
  assert.deepEqual(resolveMapSettingsLayers(settings), {
    [MAP_LAYER_KEYS.MAP_LABELS]: true,
    [MAP_LAYER_KEYS.APPROACH_BEAMS]: true,
    [MAP_LAYER_KEYS.NAVAID_MARKERS]: false,
    [MAP_LAYER_KEYS.AIRSPACES]: true,
    [MAP_LAYER_KEYS.CANDIDATE_WATCHING_SPOTS]: false,
    [MAP_LAYER_KEYS.USER_LOCATION]: false,
    [MAP_LAYER_KEYS.USER_LOCATION_AUDIO]: false,
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
  const before = getMapModePreset(MAP_MODE_IDS.RADIO).layers;
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
  assert.notEqual(before, custom.layerOverrides);
  assert.equal(getMapModePreset(MAP_MODE_IDS.RADIO).layers[MAP_LAYER_KEYS.AIRSPACES], false);
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

console.log("mapSettingsModel.test.ts ok");
