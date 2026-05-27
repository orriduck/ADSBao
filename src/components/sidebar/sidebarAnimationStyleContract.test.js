import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const aircraftRow = readFileSync(
  new URL("./AircraftRow.jsx", import.meta.url),
  "utf8",
);
const style = readFileSync(new URL("../../style.css", import.meta.url), "utf8");

const routeAlternateBlock = style.slice(
  style.indexOf(".aircraft-table-route-cycle--alternate .aircraft-table-route-face--flight"),
  style.indexOf("@keyframes aircraft-table-flight-fade"),
);
const routeFadeKeyframes = style.slice(
  style.indexOf("@keyframes aircraft-table-flight-fade"),
  style.indexOf("@keyframes aircraft-table-callsign-lift"),
);

assert.match(routeAlternateBlock, /aircraft-table-flight-fade/);
assert.match(routeAlternateBlock, /aircraft-table-route-fade/);
assert.doesNotMatch(routeAlternateBlock, /clip-path/);
assert.doesNotMatch(routeFadeKeyframes, /clip-path/);
assert.match(routeFadeKeyframes, /opacity:\s*0/);
assert.match(routeFadeKeyframes, /opacity:\s*1/);
assert.doesNotMatch(routeAlternateBlock, /aircraft-table-route-text-decode/);
assert.doesNotMatch(routeAlternateBlock, /aircraft-table-route-cursor-wipe/);
assert.doesNotMatch(routeAlternateBlock, /::before/);

assert.match(aircraftRow, /formatFlightRouteMunicipalityLabel\(\s*aircraft\.flightRoute,?\s*\)/);
assert.doesNotMatch(aircraftRow, /locale\s*===\s*["']en["']/);
assert.match(aircraftRow, /aircraft-table-route-cycle--alternate/);

assert.match(aircraftRow, /function NumberWithUnit/);
assert.match(aircraftRow, /<EndfieldValueSwap/);
assert.match(aircraftRow, /value=\{distValue\}/);
assert.match(aircraftRow, /value=\{Math\.round\(altValue\)\}/);

console.log("sidebarAnimationStyleContract.test.js ok");
