import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const desktopCardPath = fileURLToPath(
  new URL("./AirportPreviewMetadataCard.tsx", import.meta.url),
);
const previewCardPath = fileURLToPath(
  new URL("./AircraftPreviewCard.tsx", import.meta.url),
);
const mobileCardPath = fileURLToPath(
  new URL("./AirportPreviewMobileCard.tsx", import.meta.url),
);
const mobileBaseCardPath = fileURLToPath(
  new URL("./MobilePreviewCard.tsx", import.meta.url),
);
const stylePath = fileURLToPath(new URL("../../../style.css", import.meta.url));
const zhPath = fileURLToPath(new URL("../../../config/i18n/zh-CN.ts", import.meta.url));
const desktopSource = readFileSync(desktopCardPath, "utf8");
const previewSource = readFileSync(previewCardPath, "utf8");
const mobileSource = readFileSync(mobileCardPath, "utf8");
const mobileBaseSource = readFileSync(mobileBaseCardPath, "utf8");
const styleSource = readFileSync(stylePath, "utf8");
const zhSource = readFileSync(zhPath, "utf8");

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
  previewSource,
  /isAirport \? "aircraft-preview-card--airport" : ""/,
  "desktop airport preview should opt into an airport-specific card width",
);
assert.match(
  styleSource,
  /\.aircraft-preview-card--airport \{[\s\S]*?width: 320px;/,
  "desktop airport preview card should be wider than the default preview card",
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
  /MobilePreviewIdentity[\s\S]*?icon=\{TowerControl\}[\s\S]*?label=\{t\("preview\.airportPreview"\)\}/,
  "mobile airport preview should place the airport icon with the primary identity",
);
assert.match(
  mobileSource,
  /MobilePreviewIdentity[\s\S]*?secondary=\{/,
  "mobile airport preview should place short airport stats on the primary identity row",
);
assert.doesNotMatch(
  mobileSource,
  /MobilePreviewDetailRow label=/,
  "mobile airport preview should not show field labels on mobile",
);
assert.doesNotMatch(
  mobileSource,
  /MobilePreviewRuleRow/,
  "mobile airport preview should not spend a separate row on regular stats",
);
assert.match(
  mobileBaseSource,
  /mobile-preview-card-enter/,
  "base mobile preview card should own the enter animation class",
);
assert.match(
  styleSource,
  /@keyframes mobile-preview-card-enter/,
  "base mobile preview card should define a fade-up enter animation",
);
assert.match(
  styleSource,
  /prefers-reduced-motion[\s\S]*?\.mobile-preview-card-enter/,
  "base mobile preview card enter animation should respect reduced motion",
);
assert.match(
  zhSource,
  /openAirport: "追踪机场"/,
  "Chinese airport preview CTA should use the shorter track-airport label",
);

console.log("AircraftPreviewCard.airport.test.ts ok");
