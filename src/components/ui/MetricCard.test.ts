import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const metricCardPath = fileURLToPath(new URL("./MetricCard.tsx", import.meta.url));
const source = readFileSync(metricCardPath, "utf8");

assert.match(
  source,
  /rounded-\[10px\] border border-\[var\(--sidebar-tile-rest-border\)\] bg-clip-padding/,
  "metric cards should use the neutral resting border without blending it into the active background",
);
assert.doesNotMatch(
  source,
  /data-\[active=true\]:border-transparent/,
  "active metric cards should keep the same neutral border so both themes remain visible",
);

console.log("MetricCard.test.ts ok");
