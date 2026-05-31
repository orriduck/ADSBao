import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const navaidLabelLayerPath = fileURLToPath(
  new URL("./NavaidLabelLayer.tsx", import.meta.url),
);
const source = readFileSync(navaidLabelLayerPath, "utf8");

assert.match(
  source,
  /navaid-label__signal/,
  "navaid map markers should render a signal icon",
);
assert.doesNotMatch(
  source,
  /navaid-label__dot/,
  "navaid map markers should not render the old diamond dot",
);

console.log("NavaidLabelLayer.test.ts ok");
