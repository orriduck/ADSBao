import assert from "node:assert/strict";
import { createEnvironmentThreeOsmTileSource } from "./threeOsmRuntimeTileSource";

const buildTimeInput = {
  id: "build-raster",
  urlTemplate: "https://build.example.test/{z}/{x}/{y}.png",
  attribution: "Build Maps",
  attributionUrl: "https://build.example.test/attribution",
};
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

try {
  Reflect.deleteProperty(globalThis, "window");
  const buildSource = createEnvironmentThreeOsmTileSource(buildTimeInput);
  assert.equal(buildSource.origin, "build");
  assert.equal(buildSource.status, "ready");
  assert.equal(buildSource.source?.id, "build-raster");

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      __ADSBAO_ENV__: {
        VITE_THREE_OSM_RASTER_SOURCE_ID: "partial-runtime",
      },
    },
  });
  const partialRuntimeSource =
    createEnvironmentThreeOsmTileSource(buildTimeInput);
  assert.equal(partialRuntimeSource.origin, "runtime");
  assert.equal(
    partialRuntimeSource.status,
    "missing",
    "a partial runtime provider must not mix with build-time fields",
  );

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      __ADSBAO_ENV__: {
        VITE_THREE_OSM_RASTER_SOURCE_ID: "runtime-raster",
        VITE_THREE_OSM_RASTER_URL_TEMPLATE:
          "https://runtime.example.test/{z}/{x}/{y}.png",
        VITE_THREE_OSM_RASTER_ATTRIBUTION: "Runtime Maps",
        VITE_THREE_OSM_RASTER_ATTRIBUTION_URL:
          "https://runtime.example.test/attribution",
      },
    },
  });
  const runtimeSource = createEnvironmentThreeOsmTileSource(buildTimeInput);
  assert.equal(runtimeSource.origin, "runtime");
  assert.equal(runtimeSource.status, "ready");
  assert.equal(runtimeSource.source?.id, "runtime-raster");
  assert.equal(
    runtimeSource.source?.buildUrl({ z: 9, x: 150, y: 191 }),
    "https://runtime.example.test/9/150/191.png",
  );
} finally {
  if (originalWindow) {
    Object.defineProperty(globalThis, "window", originalWindow);
  } else {
    Reflect.deleteProperty(globalThis, "window");
  }
}

console.log("threeOsmRuntimeTileSource.test.ts ok");
