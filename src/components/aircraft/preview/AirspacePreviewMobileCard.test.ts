import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const mobileCardPath = fileURLToPath(
  new URL("./AirspacePreviewMobileCard.tsx", import.meta.url),
);
const source = readFileSync(mobileCardPath, "utf8");

assert.match(
  source,
  /resolveAirspacePreviewDisplay\(airspace, locale\)/,
  "mobile airspace preview should use the same localized display model as desktop",
);
assert.match(
  source,
  /whitespace-normal break-words/,
  "mobile airspace preview title should be allowed to wrap instead of overflowing",
);
assert.match(
  source,
  /MobilePreviewDetailRow wrap/,
  "mobile airspace preview should use airport-style right-aligned detail rows",
);
assert.match(
  source,
  /typeAndClass = \[display\.type, display\.classLabel\]/,
  "mobile airspace preview should combine airspace type and class in the airport-style detail area",
);
assert.match(
  source,
  /display\.vertical/,
  "mobile airspace preview should keep the vertical range in one compact right-side field",
);
assert.doesNotMatch(
  source,
  /MobilePreviewMetaChip/,
  "mobile airspace preview should not put the full vertical range in one nowrap chip",
);

console.log("AirspacePreviewMobileCard.test.ts ok");
