import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const explorerPath = fileURLToPath(
  new URL("../airport/explorer/AirportExplorer.tsx", import.meta.url),
);
const drawerPath = fileURLToPath(
  new URL("./controls/MapLayerDrawer.tsx", import.meta.url),
);
const enPath = fileURLToPath(new URL("../../config/i18n/en.ts", import.meta.url));
const zhPath = fileURLToPath(
  new URL("../../config/i18n/zh-CN.ts", import.meta.url),
);

const explorerSource = readFileSync(explorerPath, "utf8");
const drawerSource = readFileSync(drawerPath, "utf8");
const enSource = readFileSync(enPath, "utf8");
const zhSource = readFileSync(zhPath, "utf8");

assert.match(
  explorerSource,
  /if \(userLocation\) \{[\s\S]*?setUserLocation\(null\);[\s\S]*?setUserLocationNotice\(""\);[\s\S]*?return;/,
  "active user location control should toggle the marker off before requesting geolocation again",
);
assert.match(
  drawerSource,
  /mapLayers\.hideUserLocation/,
  "active user location button should be labeled as a hide action",
);
assert.doesNotMatch(
  drawerSource,
  /mapLayers\.updateUserLocation/,
  "active user location button should not be presented as an update-only action",
);
assert.match(
  enSource,
  /hideUserLocation: "Hide my location"/,
  "English copy should expose a hide-my-location action",
);
assert.match(
  zhSource,
  /hideUserLocation: "隐藏我的位置"/,
  "Chinese copy should expose a hide-my-location action",
);

console.log("UserLocationControl.test.ts ok");
