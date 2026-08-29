import assert from "node:assert/strict";
import {
  ADSBAO_OFFLINE_TILE_RUNTIME_ENV,
  buildRuntimeEnvAssignment,
  runtimeEnvHasKey,
  runtimeEnvValue,
} from "./runtimeEnv";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

try {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {},
  });
  assert.equal(runtimeEnvHasKey("VITE_THREE_OSM_RASTER_SOURCE_ID"), false);

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      __ADSBAO_ENV__: {
        VITE_THREE_OSM_RASTER_SOURCE_ID: "runtime-raster",
        VITE_THREE_OSM_RASTER_URL_TEMPLATE: "",
      },
    },
  });

  assert.equal(
    runtimeEnvValue("VITE_THREE_OSM_RASTER_SOURCE_ID", "build-raster"),
    "runtime-raster",
  );
  assert.equal(runtimeEnvHasKey("VITE_THREE_OSM_RASTER_SOURCE_ID"), true);
  assert.equal(
    runtimeEnvValue(
      "VITE_THREE_OSM_RASTER_URL_TEMPLATE",
      "https://build.example/{z}/{x}/{y}.png",
    ),
    "",
    "an explicit empty runtime value disables a build-time provider",
  );
  assert.equal(
    runtimeEnvValue(
      "VITE_THREE_OSM_RASTER_ATTRIBUTION",
      "Build attribution",
    ),
    "Build attribution",
    "an absent runtime key keeps the local build-time fallback",
  );
  assert.equal(runtimeEnvHasKey("VITE_THREE_OSM_RASTER_ATTRIBUTION"), false);
} finally {
  if (originalWindow) {
    Object.defineProperty(globalThis, "window", originalWindow);
  } else {
    Reflect.deleteProperty(globalThis, "window");
  }
}

assert.equal(
  runtimeEnvValue("VITE_THREE_OSM_RASTER_SOURCE_ID", "server-fallback"),
  "server-fallback",
);
assert.equal(runtimeEnvHasKey("VITE_THREE_OSM_RASTER_SOURCE_ID"), false);
const offlineScript = buildRuntimeEnvAssignment(
  ADSBAO_OFFLINE_TILE_RUNTIME_ENV,
);
assert.match(offlineScript, /VITE_THREE_OSM_RASTER_URL_TEMPLATE/);
assert.match(offlineScript, /Object\.assign/);
assert.equal(offlineScript.includes("build-raster"), false);

console.log("runtimeEnv.test.ts ok");
