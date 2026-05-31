import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const previewCardPath = fileURLToPath(
  new URL("./AircraftPreviewCard.tsx", import.meta.url),
);
const source = readFileSync(previewCardPath, "utf8");
const mobileCardPath = fileURLToPath(
  new URL("./NavaidPreviewMobileCard.tsx", import.meta.url),
);
const mobileSource = readFileSync(mobileCardPath, "utf8");

assert.match(
  source,
  /NavaidPreviewMetadataCard/,
  "desktop preview should support navaid metadata cards",
);
assert.match(
  source,
  /NavaidPreviewMobileCard/,
  "mobile preview should support navaid metadata cards",
);
assert.match(
  source,
  /preview\.navaidPreview/,
  "navaid previews should use a distinct aria label",
);
assert.match(
  mobileSource,
  /navaid-preview-mobile-card__summary/,
  "mobile navaid preview should use a compact single-line summary instead of a staggered two-row identity",
);
assert.match(
  mobileSource,
  /\{type \? <Stat plain=\{type\} \/> : null\}/,
  "mobile navaid preview should put the navaid type in the right-side metadata row",
);
assert.doesNotMatch(
  mobileSource,
  /summary = \[type, name\]/,
  "mobile navaid preview should not put type in the title summary",
);
assert.doesNotMatch(
  mobileSource,
  /grid-cols-\[minmax\(0,1fr\)_auto\]/,
  "mobile navaid preview should not split ident and type to opposite sides",
);

console.log("AircraftPreviewCard.navaid.test.ts ok");
