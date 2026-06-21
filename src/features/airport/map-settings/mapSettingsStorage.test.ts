import assert from "node:assert/strict";

import {
  MAP_MODE_IDS,
  normalizeMapSettings,
} from "./mapSettingsModel";
import {
  readStoredMapSettings,
  writeStoredMapSettings,
} from "./mapSettingsStorage";

const originalWindow = (globalThis as any).window;
const store = new Map<string, string>();

(globalThis as any).window = {
  localStorage: {
    getItem(key: string) {
      return store.get(key) || null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  },
};

try {
  writeStoredMapSettings(
    {
      selectedMode: "immersive",
      baseMode: "immersive",
      hasSelectedMode: true,
    },
  );

  assert.equal(
    normalizeMapSettings(readStoredMapSettings() || {}).selectedMode,
    MAP_MODE_IDS.CUSTOM,
    "cache should migrate legacy immersive settings to custom defaults",
  );

  writeStoredMapSettings(
    {
      selectedMode: MAP_MODE_IDS.RADIO,
      baseMode: MAP_MODE_IDS.RADIO,
      hasSelectedMode: true,
    },
    "mobile",
  );

  assert.equal(
    normalizeMapSettings(readStoredMapSettings("mobile") || {}).selectedMode,
    MAP_MODE_IDS.RADIO,
    "mobile settings should be stored separately from desktop settings",
  );
  assert.equal(
    normalizeMapSettings(readStoredMapSettings("desktop") || {}).selectedMode,
    MAP_MODE_IDS.CUSTOM,
    "desktop settings should keep the legacy storage key",
  );
} finally {
  if (typeof originalWindow === "undefined") {
    delete (globalThis as any).window;
  } else {
    (globalThis as any).window = originalWindow;
  }
}

console.log("mapSettingsStorage.test.ts ok");
