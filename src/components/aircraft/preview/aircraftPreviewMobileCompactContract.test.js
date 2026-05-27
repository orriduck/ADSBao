import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const mobileCard = readFileSync(
  new URL("./AircraftPreviewMobileCard.jsx", import.meta.url),
  "utf8",
);
const previewCard = readFileSync(
  new URL("./AircraftPreviewCard.jsx", import.meta.url),
  "utf8",
);
const style = readFileSync(new URL("../../../style.css", import.meta.url), "utf8");

assert.match(mobileCard, /aircraft-preview-mobile-card__route-stats/);
assert.doesNotMatch(mobileCard, /aircraft-preview-mobile-card__sep/);
assert.match(previewCard, /aircraft-preview-mobile-card__actions/);
assert.match(previewCard, /aircraft-preview-mobile-card__feedback-link/);
assert.match(previewCard, /aircraft-preview-mobile-card__track/);

const cardBlock = style.slice(
  style.indexOf(".aircraft-preview-mobile-card {"),
  style.indexOf(".aircraft-preview-mobile-card::before"),
);
assert.match(cardBlock, /repeating-linear-gradient/);
assert.match(cardBlock, /0 0 \/ 46px 100% no-repeat/);

const routeStatsBlock = style.slice(
  style.indexOf(".aircraft-preview-mobile-card__route-stats"),
  style.indexOf(
    ".aircraft-preview-mobile-card__route {",
    style.indexOf(".aircraft-preview-mobile-card__route-stats"),
  ),
);
assert.match(routeStatsBlock, /display:\s*flex/);
assert.match(routeStatsBlock, /justify-content:\s*space-between/);

const actionsBlock = style.slice(
  style.indexOf(".aircraft-preview-mobile-card__actions"),
  style.indexOf(".aircraft-preview-mobile-card__track", style.indexOf(".aircraft-preview-mobile-card__actions")),
);
assert.match(actionsBlock, /display:\s*grid/);
assert.match(actionsBlock, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\)/);
assert.match(actionsBlock, /margin:\s*0\s+12px\s+0\s+56px/);

const row1Block = style.slice(
  style.indexOf(".aircraft-preview-mobile-card__row1"),
  style.indexOf(
    ".aircraft-preview-mobile-card__callsign,",
    style.indexOf(".aircraft-preview-mobile-card__row1"),
  ),
);
assert.match(row1Block, /display:\s*grid/);
assert.match(row1Block, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto/);
assert.match(row1Block, /width:\s*100%/);

const trackBlock = style.slice(
  style.indexOf(".aircraft-preview-mobile-card__track"),
  style.indexOf(".aircraft-preview-mobile-card__track:hover"),
);
const feedbackBlock = style.slice(
  style.indexOf(".aircraft-preview-mobile-card__feedback-link"),
  style.indexOf(".aircraft-preview-mobile-card__feedback-link:active"),
);
assert.match(trackBlock, /background:/);
assert.match(feedbackBlock, /background:/);
assert.notEqual(trackBlock, feedbackBlock);

console.log("aircraftPreviewMobileCompactContract.test.js ok");
