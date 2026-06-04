import assert from "node:assert/strict";

import {
  MAP_MODE_IDS,
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
      selectedMode: MAP_MODE_IDS.IMMERSIVE,
      baseMode: MAP_MODE_IDS.IMMERSIVE,
      hasSelectedMode: true,
    },
  );

  assert.equal(
    readStoredMapSettings()?.selectedMode,
    MAP_MODE_IDS.IMMERSIVE,
    "cache should preserve immersive settings without a feature flag",
  );
} finally {
  if (typeof originalWindow === "undefined") {
    delete (globalThis as any).window;
  } else {
    (globalThis as any).window = originalWindow;
  }
}

console.log("mapSettingsStorage.test.ts ok");
