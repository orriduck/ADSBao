import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wrapper = readFileSync(
  new URL("./MobileMapSourceStatus.jsx", import.meta.url),
  "utf8",
);
const component = readFileSync(
  new URL("../map/MapSourceStatusDisplay.jsx", import.meta.url),
  "utf8",
);
const style = readFileSync(new URL("../../style.css", import.meta.url), "utf8");

assert.match(wrapper, /MapSourceStatusDisplay/);
assert.match(wrapper, /buildMapSourceStatusDisplay/);
assert.doesNotMatch(wrapper, /buildMobileMapSourceStatus/);
assert.match(wrapper, /placement="mobile-map"/);
assert.match(wrapper, /loadingMotion="static"/);
assert.doesNotMatch(component, /useRef/);
assert.doesNotMatch(component, /loadingEntering/);
assert.match(component, /useState\(\s*loadingStatus,\s*\)/);
assert.match(component, /window\.setTimeout\(\(\) => \{/);
assert.match(component, /setDisplayedLoadingStatus\(""\);/);
assert.match(component, /\}, 260\);/);
assert.match(component, /map-source-status--loading-active/);
assert.match(component, /map-source-status__primary/);
assert.match(component, /map-source-status__loading-slot/);
assert.match(component, /map-source-status--shift-loading/);
assert.doesNotMatch(component, /CLASS_BY_VARIANT/);
assert.match(component, /loadingActive \? "is-active" : ""/);
assert.match(component, /aria-hidden=\{!loadingActive\}/);
assert.doesNotMatch(component, /identityKey=\{`loading:/);

const rootBlock = style.slice(
  style.indexOf(".map-source-status {"),
  style.indexOf(".map-source-status--mobile-map"),
);
assert.match(rootBlock, /gap:\s*1px/);

const mobilePlacementBlock = style.slice(
  style.indexOf(".map-source-status--mobile-map {"),
  style.indexOf(".airport-map-menu--mobile .map-source-status--mobile-map"),
);
assert.match(mobilePlacementBlock, /right:\s*12px/);
assert.match(mobilePlacementBlock, /max-width:\s*calc\(100vw - 132px\)/);
assert.doesNotMatch(mobilePlacementBlock, /left:\s*110px/);

function ruleBlock(selector, from = 0) {
  const start = style.indexOf(selector, from);
  assert.notEqual(start, -1, `${selector} rule should exist`);
  return style.slice(start, style.indexOf("}", start) + 1);
}

const sharedPrimaryBlock = style.slice(
  style.indexOf(".map-source-status__primary {"),
  style.indexOf(".map-source-status--shift-loading.map-source-status--loading-active"),
);

assert.match(sharedPrimaryBlock, /gap:\s*1px/);
assert.match(sharedPrimaryBlock, /transition:\s*transform 260ms cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\)/);

const lineBlock = ruleBlock(".map-source-status__line {");
assert.match(lineBlock, /gap:\s*7px/);
assert.match(lineBlock, /letter-spacing:\s*0\.035em/);

const routeBlock = ruleBlock(".map-source-status__route {", style.indexOf(".map-source-status__line {"));
assert.match(routeBlock, /gap:\s*5px/);
assert.match(routeBlock, /letter-spacing:\s*0\.2em/);

const staticLoadingSlotBlock = style.slice(
  style.indexOf(".map-source-status__loading-slot {"),
  style.indexOf(".map-source-status--shift-loading .map-source-status__loading-slot"),
);
assert.match(staticLoadingSlotBlock, /display:\s*flex/);
assert.doesNotMatch(staticLoadingSlotBlock, /grid-template-rows/);

const loadingTextBlock = style.slice(
  style.indexOf(".map-source-status__loading {"),
  style.indexOf(".map-source-status__loading-slot.is-active .map-source-status__loading"),
);
assert.match(loadingTextBlock, /opacity:\s*0/);
assert.match(loadingTextBlock, /line-height:\s*1/);
assert.match(loadingTextBlock, /opacity 200ms ease-out/);
assert.doesNotMatch(loadingTextBlock, /endf-content-swap/);
assert.doesNotMatch(loadingTextBlock, /grid-template-rows/);

const loadingActiveBlock = style.slice(
  style.indexOf(".map-source-status__loading-slot.is-active .map-source-status__loading"),
  style.indexOf(".map-source-status__source,"),
);
assert.match(loadingActiveBlock, /opacity:\s*1/);
assert.doesNotMatch(style, /@keyframes airport-map-source-status-lift/);

const reducedMotionBlock = style.slice(
  style.lastIndexOf("@media (prefers-reduced-motion: reduce)"),
);
assert.match(reducedMotionBlock, /map-source-status__primary/);
assert.match(reducedMotionBlock, /map-source-status__loading/);

console.log("mobileMapSourceStatusMotionContract.test.js ok");
