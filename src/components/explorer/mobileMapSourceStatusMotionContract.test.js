import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const component = readFileSync(
  new URL("./MobileMapSourceStatus.jsx", import.meta.url),
  "utf8",
);
const style = readFileSync(new URL("../../style.css", import.meta.url), "utf8");

assert.match(component, /useState\(\s*loadingStatus,\s*\)/);
assert.match(component, /window\.setTimeout\(\(\) => \{/);
assert.match(component, /setDisplayedLoadingStatus\(""\);/);
assert.match(component, /\}, 220\);/);
assert.match(component, /airport-map-source-status--loading-active/);
assert.match(component, /loadingActive \? "is-active" : ""/);
assert.match(component, /aria-hidden=\{!loadingActive\}/);
assert.match(component, /identityKey=\{`loading:\$\{displayedLoadingStatus \|\| "idle"\}`\}/);

const statusBlock = style.slice(
  style.indexOf(".airport-map-source-status__line,"),
  style.indexOf(".airport-map-source-status__source,", style.indexOf(".airport-map-source-status__line,")),
);

assert.match(statusBlock, /transition:\s*transform 220ms cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\)/);
assert.match(statusBlock, /airport-map-source-status--loading-active/);
assert.match(statusBlock, /transform:\s*translateY\(-3px\)/);
assert.match(statusBlock, /opacity:\s*0/);
assert.match(statusBlock, /transform:\s*translateY\(-5px\)/);
assert.match(statusBlock, /opacity 180ms ease-out/);
assert.match(statusBlock, /\.airport-map-source-status__loading\.is-active/);
assert.match(statusBlock, /opacity:\s*1/);
assert.match(statusBlock, /transform:\s*translateY\(0\)/);

const reducedMotionBlock = style.slice(
  style.lastIndexOf("@media (prefers-reduced-motion: reduce)"),
);
assert.match(reducedMotionBlock, /airport-map-source-status__line/);
assert.match(reducedMotionBlock, /airport-map-source-status__route/);
assert.match(reducedMotionBlock, /airport-map-source-status__loading/);

console.log("mobileMapSourceStatusMotionContract.test.js ok");
