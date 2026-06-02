import assert from "node:assert/strict";

import {
  MAP_LAYER_KEYS,
  MAP_MODE_IDS,
  buildCustomMapSettings,
  getMapModePreset,
  normalizeMapSettings,
  resolveMapSettingsLayers,
} from "./mapSettingsModel";

{
  const spotting = getMapModePreset(MAP_MODE_IDS.SPOTTING);
  assert.equal(spotting.id, MAP_MODE_IDS.SPOTTING);
  assert.equal(spotting.layers[MAP_LAYER_KEYS.MAP_LABELS], true);
  assert.equal(spotting.layers[MAP_LAYER_KEYS.APPROACH_BEAMS], true);
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

console.log("mapSettingsModel.test.ts ok");
