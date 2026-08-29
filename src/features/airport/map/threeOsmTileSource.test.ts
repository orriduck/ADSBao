import assert from "node:assert/strict";
import {
  createConfiguredThreeOsmTileSource,
  THREE_OSM_CONFIG_UNAVAILABLE_TILE_SOURCE,
  THREE_OSM_DEBUG_FAILURE_TILE_SOURCE,
  THREE_OSM_STANDARD_TILE_SOURCE,
} from "./threeOsmTileSource";

const ready = createConfiguredThreeOsmTileSource({
  id: "Licensed Raster",
  urlTemplate: "https://tiles.example.test/styles/basic/256/{z}/{x}/{y}.png?key=public",
  attribution: "© Example Maps © OpenStreetMap contributors",
  attributionUrl: "https://example.test/attribution",
});
assert.equal(ready.status, "ready");
assert.equal(ready.source?.id, "configured-raster");
assert.equal(
  ready.source?.buildUrl({ z: 12, x: 1204, y: 1539 }),
  "https://tiles.example.test/styles/basic/256/12/1204/1539.png?key=public",
);
assert.equal(ready.source?.attributionUrl, "https://example.test/attribution");

const named = createConfiguredThreeOsmTileSource({
  id: "licensed-raster",
  urlTemplate: "https://tiles.example.test/{z}/{x}/{y}.png",
  attribution: "Example",
  attributionUrl: "https://example.test/legal",
});
assert.equal(named.source?.id, "licensed-raster");

assert.deepEqual(createConfiguredThreeOsmTileSource({}), {
  status: "missing",
  source: null,
});
assert.equal(
  createConfiguredThreeOsmTileSource({
    urlTemplate: "http://tiles.example.test/{z}/{x}/{y}.png",
    attribution: "Example",
    attributionUrl: "https://example.test/legal",
  }).status,
  "invalid",
);
assert.equal(
  createConfiguredThreeOsmTileSource({
    urlTemplate: "https://tiles.example.test/{z}/{x}.png",
    attribution: "Example",
    attributionUrl: "https://example.test/legal",
  }).status,
  "invalid",
);
assert.equal(
  createConfiguredThreeOsmTileSource({
    urlTemplate: "https://tiles.example.test/{z}/{x}/{y}.png",
    attribution: "Example",
    attributionUrl: "javascript:alert(1)",
  }).status,
  "invalid",
);

assert.equal(THREE_OSM_STANDARD_TILE_SOURCE.attributionUrl?.startsWith("https://"), true);
assert.equal(THREE_OSM_DEBUG_FAILURE_TILE_SOURCE.attributionUrl, null);
assert.equal(THREE_OSM_CONFIG_UNAVAILABLE_TILE_SOURCE.attributionUrl, null);

console.log("threeOsmTileSource.test.ts ok");
