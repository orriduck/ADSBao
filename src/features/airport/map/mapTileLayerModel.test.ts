import assert from "node:assert/strict";

import {
  shouldAttemptMapLibreTiles,
  shouldLogMapTileLayerFailure,
  shouldSuppressMapLibreTileError,
} from "./mapTileLayerModel";

assert.equal(
  shouldAttemptMapLibreTiles({
    userAgent:
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/143.0.0.0 Safari/537.36",
    webGlAvailable: true,
  }),
  false,
);
assert.equal(
  shouldAttemptMapLibreTiles({
    userAgent:
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
    webGlAvailable: false,
  }),
  false,
);
assert.equal(
  shouldAttemptMapLibreTiles({
    userAgent:
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
    webGlAvailable: true,
  }),
  true,
);

assert.equal(
  shouldLogMapTileLayerFailure(new Error("WebGL context creation failed")),
  false,
);
assert.equal(
  shouldLogMapTileLayerFailure(new Error("OpenFreeMap style request failed: 503")),
  true,
);

assert.equal(
  shouldSuppressMapLibreTileError({
    error: new Error(
      "AJAXError: Failed to fetch (0): https://tiles.openfreemap.org/planet/20260531_080002_pt/9/153/194.pbf",
    ),
  }),
  true,
);
assert.equal(
  shouldSuppressMapLibreTileError({
    error: new Error("Style image missing: aircraft-icon"),
  }),
  false,
);

console.log("mapTileLayerModel.test.ts ok");
