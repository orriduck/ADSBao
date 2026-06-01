import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const stylePath = fileURLToPath(new URL("../../../style.css", import.meta.url));
const styleSource = readFileSync(stylePath, "utf8");

assert.match(
  styleSource,
  /\.aircraft-preview-telemetry \{[\s\S]*?grid-template-columns: repeat\(3, 1fr\);/,
  "aircraft preview telemetry should keep three equal grid columns",
);
assert.match(
  styleSource,
  /\.aircraft-preview-telemetry \.aircraft-preview-stat:nth-child\(2\) \{[\s\S]*?align-items: center;[\s\S]*?text-align: center;/,
  "aircraft preview telemetry middle stat should be centered in its grid column",
);
assert.match(
  styleSource,
  /\.aircraft-preview-telemetry \.aircraft-preview-stat:nth-child\(2\) \.aircraft-preview-stat__value \{[\s\S]*?justify-content: center;/,
  "aircraft preview telemetry middle value should align to the center",
);

console.log("AircraftPreviewTelemetry.test.ts ok");
