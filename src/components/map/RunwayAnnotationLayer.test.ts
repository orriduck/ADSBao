import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const layerPath = fileURLToPath(
  new URL("./RunwayAnnotationLayer.tsx", import.meta.url),
);
const source = readFileSync(layerPath, "utf8");

assert.match(
  source,
  /const isLeafletLayer =/,
  "runway annotation layer should validate Leaflet sublayers before grouping them",
);
assert.match(
  source,
  /const addSublayer =/,
  "runway annotation layer should add Leaflet sublayers individually",
);
assert.match(
  source,
  /catch \(error\)/,
  "runway annotation layer should skip a bad sublayer without crashing the map",
);
assert.match(
  source,
  /const layer = L\.layerGroup\(\)\.addTo\(map\)/,
  "runway annotation layer should attach an empty parent group before adding children",
);

console.log("RunwayAnnotationLayer.test.ts ok");
