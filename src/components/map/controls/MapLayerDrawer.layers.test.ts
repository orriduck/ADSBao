import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const drawerPath = fileURLToPath(new URL("./MapLayerDrawer.tsx", import.meta.url));
const iconsPath = fileURLToPath(new URL("./mapControlIcons.tsx", import.meta.url));
const controlBarPath = fileURLToPath(new URL("../../ui/MapControlBar.tsx", import.meta.url));
const airportMapPath = fileURLToPath(new URL("../AirportMap.tsx", import.meta.url));
const explorerUiPath = fileURLToPath(new URL("../../explorer/ExplorerUiContext.tsx", import.meta.url));
const drawerSource = readFileSync(drawerPath, "utf8");
const iconsSource = readFileSync(iconsPath, "utf8");
const controlBarSource = readFileSync(controlBarPath, "utf8");
const airportMapSource = readFileSync(airportMapPath, "utf8");
const explorerUiSource = readFileSync(explorerUiPath, "utf8");

assert.match(
  drawerSource,
  /iconKey: "antenna"[\s\S]*?prop: "showNavaidMarkers"/,
  "navaid layer toggle should use the antenna icon",
);
assert.match(
  drawerSource,
  /prop: "showNavaidMarkers"[\s\S]*?iconKey: "shieldAlert"[\s\S]*?prop: "showAirspaces"/,
  "airspace layer toggle should sit immediately after the navaid toggle",
);
assert.match(
  iconsSource,
  /Antenna/,
  "map control icons should expose the lucide antenna icon",
);
assert.match(
  iconsSource,
  /ShieldAlert/,
  "map control icons should expose the shield alert icon for airspace",
);
assert.match(
  controlBarSource,
  /showAirspaces=\{showAirspaces\}/,
  "map control bar should pass the airspace layer state into the drawer",
);
assert.match(
  airportMapSource,
  /<AirspaceLayer[\s\S]*?visible=\{showAirspaces\}/,
  "airport map should hide and show the airspace layer from toolbar state",
);
assert.match(
  explorerUiSource,
  /adsbao:airport-map-layers:v1/,
  "airport map layer toggles should be persisted in browser local storage",
);
assert.match(
  explorerUiSource,
  /showMapLabels[\s\S]*showRunwayBeams[\s\S]*showNavaidMarkers[\s\S]*showAirspaces/,
  "layer persistence should include map labels, runway beams, navaids, and airspaces",
);
assert.match(
  explorerUiSource,
  /hydrateLayerPreferences/,
  "stored browser layer preferences should hydrate the explorer UI state",
);

console.log("MapLayerDrawer.layers.test.ts ok");
