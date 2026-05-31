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
const desktopCardPath = fileURLToPath(
  new URL("./NavaidPreviewMetadataCard.tsx", import.meta.url),
);
const mobileSource = readFileSync(mobileCardPath, "utf8");
const desktopSource = readFileSync(desktopCardPath, "utf8");

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
  /MobilePreviewIdentity[\s\S]*?icon=\{RadioTower\}[\s\S]*?label=\{t\("preview\.navaidPreview"\)\}/,
  "mobile navaid preview should place the navaid icon with the primary identity",
);
assert.match(
  mobileSource,
  /secondary=\{type\}/,
  "mobile navaid preview should put the navaid type on the right side of the identity row",
);
assert.doesNotMatch(
  mobileSource,
  /MobilePreviewDetailRow wrap/,
  "mobile navaid preview should not spend a separate row on the navaid name",
);
assert.doesNotMatch(
  mobileSource,
  /MobilePreviewDetailRow label=/,
  "mobile navaid preview should not show field labels on mobile",
);
assert.match(
  mobileSource,
  /MobilePreviewRuleRow/,
  "mobile navaid preview should keep navaid name and regular data in one compact rule row",
);
assert.match(
  mobileSource,
  /left=\{name \? <span className="block min-w-0 truncate whitespace-nowrap">/,
  "mobile navaid preview should truncate long navaid names inside the compact rule row",
);
assert.match(
  mobileSource,
  /frequency \? \([\s\S]*?<MobilePreviewMetaChip>/,
  "mobile navaid preview should put frequency with the right-side stats group",
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
assert.match(
  desktopSource,
  /preview\.navaidType/,
  "desktop navaid preview should label the type value in the header",
);
assert.match(
  desktopSource,
  /preview\.navaidName/,
  "desktop navaid preview should label the name value in the header",
);
assert.match(
  desktopSource,
  /identityRows/,
  "desktop navaid preview should render name and type as identity rows",
);
assert.match(
  desktopSource,
  /className="relative"/,
  "desktop navaid preview header should let the identity rows use the full card width",
);
assert.match(
  desktopSource,
  /absolute right-0 top-0/,
  "desktop navaid preview icon should not consume identity-row width",
);
assert.match(
  desktopSource,
  /w-full grid-cols-\[auto_minmax\(0,1fr\)\]/,
  "desktop navaid identity rows should use the same left-label/right-value alignment as metadata fields",
);
assert.doesNotMatch(
  desktopSource,
  /flex items-start justify-between gap-3/,
  "desktop navaid identity rows should not be inside a header flex layout that shortens the value column",
);
assert.doesNotMatch(
  desktopSource,
  /grid-cols-\[minmax\(0,1fr\)_auto\]/,
  "desktop navaid identity rows should not split name and type into side-by-side blocks",
);
assert.doesNotMatch(
  desktopSource,
  /text-\[15px\] font-semibold/,
  "desktop navaid identity values should not use a different title-style font from metadata values",
);

console.log("AircraftPreviewCard.navaid.test.ts ok");
