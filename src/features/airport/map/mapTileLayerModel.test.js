import assert from "node:assert/strict";

import {
  shouldAttemptMapLibreTiles,
  shouldLogMapTileLayerFailure,
} from "./mapTileLayerModel.js";

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

console.log("mapTileLayerModel.test.js ok");
