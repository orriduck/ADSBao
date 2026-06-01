import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const filterCardPath = fileURLToPath(new URL("./FilterCard.tsx", import.meta.url));
const source = readFileSync(filterCardPath, "utf8");

assert.match(
  source,
  /rounded-\[var\(--atc-radius-card\)\] border border-\[var\(--sidebar-tile-rest-border\)\] bg-clip-padding/,
  "filter cards should use the card radius token and the same neutral resting border as metric cards",
);
assert.doesNotMatch(
  source,
  /data-\[(active=true|state=open)\]:border-transparent/,
  "active and open filter cards should keep the same neutral border",
);
assert.doesNotMatch(
  source,
  /\[\.airport-map-kit_&\]:rounded-\[7px\]/,
  "map-kit filter cards should inherit the map kit card radius token instead of hardcoding a smaller radius",
);

console.log("FilterCard.test.ts ok");
