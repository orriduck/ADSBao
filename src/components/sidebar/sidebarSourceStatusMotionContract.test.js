import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const shell = readFileSync(new URL("./SidebarShell.jsx", import.meta.url), "utf8");
const component = readFileSync(
  new URL("../map/MapSourceStatusDisplay.jsx", import.meta.url),
  "utf8",
);
const style = readFileSync(new URL("../../style.css", import.meta.url), "utf8");

assert.match(shell, /MapSourceStatusDisplay/);
assert.match(shell, /buildMapSourceStatusDisplay/);
assert.doesNotMatch(shell, /getRouteProviderDisplayName/);
assert.match(shell, /routeProviderLabel=\{sourceStatus\.routeProvider\}/);
assert.match(shell, /placement="sidebar"/);
assert.match(shell, /loadingMotion="shift"/);
assert.match(component, /useState\(\s*loadingStatus,\s*\)/);
assert.match(component, /setDisplayedLoadingStatus\(""\);/);
assert.match(component, /\}, 260\);/);
assert.match(component, /map-source-status--loading-active/);
assert.match(component, /map-source-status__primary/);
assert.match(component, /map-source-status__loading-slot/);
assert.match(component, /map-source-status__loading/);
assert.match(component, /map-source-status--shift-loading/);
assert.doesNotMatch(component, /CLASS_BY_VARIANT/);
assert.doesNotMatch(component, /identityKey=\{`loading:/);

const statusBlock = style.slice(
  style.indexOf(".map-source-status {"),
  style.indexOf(".airport-feed-status--infer"),
);

assert.match(statusBlock, /--map-source-status-primary-y:\s*0px/);
assert.match(statusBlock, /\.map-source-status__primary\s*\{[^}]*gap:\s*1px/s);
assert.match(statusBlock, /\.map-source-status__line\s*\{[^}]*gap:\s*7px/s);
assert.match(statusBlock, /\.map-source-status__line\s*\{[^}]*letter-spacing:\s*0\.035em/s);
assert.match(statusBlock, /\.map-source-status__route\s*\{[^}]*gap:\s*5px/s);
assert.match(statusBlock, /\.map-source-status__route\s*\{[^}]*letter-spacing:\s*0\.2em/s);
assert.match(statusBlock, /transition:\s*transform 260ms cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\)/);
assert.match(statusBlock, /map-source-status--shift-loading\.map-source-status--loading-active/);
assert.match(statusBlock, /--map-source-status-primary-y:\s*-5px/);
assert.match(statusBlock, /grid-template-rows:\s*0fr/);
assert.match(statusBlock, /grid-template-rows 260ms cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\)/);
assert.match(statusBlock, /grid-template-rows:\s*1fr/);
assert.match(statusBlock, /opacity:\s*0/);
assert.match(statusBlock, /opacity 200ms ease-out/);
assert.match(statusBlock, /\.map-source-status__loading-slot\.is-active \.map-source-status__loading/);
assert.match(statusBlock, /opacity:\s*1/);
assert.doesNotMatch(style, /\.map-source-status--sidebar\s*\{/);

const reducedMotionBlock = style.slice(
  style.lastIndexOf("@media (prefers-reduced-motion: reduce)"),
);
assert.match(reducedMotionBlock, /map-source-status__primary/);
assert.match(reducedMotionBlock, /map-source-status__loading-slot/);
assert.match(reducedMotionBlock, /map-source-status__loading/);

console.log("sidebarSourceStatusMotionContract.test.js ok");
