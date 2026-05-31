import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const desktopCardPath = fileURLToPath(
  new URL("./AirportPreviewMetadataCard.tsx", import.meta.url),
);
const mobileCardPath = fileURLToPath(
  new URL("./AirportPreviewMobileCard.tsx", import.meta.url),
);
const desktopSource = readFileSync(desktopCardPath, "utf8");
const mobileSource = readFileSync(mobileCardPath, "utf8");

assert.match(
  desktopSource,
  /TowerControl/,
  "desktop airport preview should use an airport-specific header icon",
);
assert.match(
  desktopSource,
  /detailRows/,
  "desktop airport preview should use a second metadata group like navaid previews",
);
assert.match(
  desktopSource,
  /grid-cols-\[auto_minmax\(0,1fr\)\]/,
  "desktop airport preview detail rows should align labels and right-side values",
);
assert.match(
  desktopSource,
  /text-\[14px\][^"]*whitespace-normal[^"]*break-words/,
  "desktop airport preview name should be one size smaller and wrap when long",
);
assert.match(
  desktopSource,
  /text-\[11px\][^"]*whitespace-normal[^"]*break-words/,
  "desktop airport preview place should be one size smaller and wrap when long",
);
assert.doesNotMatch(
  desktopSource,
  /<dd className="mt-1 truncate text-\[15px\]/,
  "desktop airport preview name should not truncate long airport names",
);
assert.doesNotMatch(
  desktopSource,
  /<dd className="mt-1 truncate text-\[12px\]/,
  "desktop airport preview place should not truncate long location text",
);
assert.match(
  mobileSource,
  /airport-preview-mobile-card__summary/,
  "mobile airport preview should use a compact single-line summary",
);
assert.doesNotMatch(
  mobileSource,
  /flex-col/,
  "mobile airport preview should not keep the old stacked two-line layout",
);

console.log("AircraftPreviewCard.airport.test.ts ok");
