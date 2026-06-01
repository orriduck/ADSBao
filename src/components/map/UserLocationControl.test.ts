import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const explorerPath = fileURLToPath(
  new URL("../airport/explorer/AirportExplorer.tsx", import.meta.url),
);
const drawerPath = fileURLToPath(
  new URL("./controls/MapLayerDrawer.tsx", import.meta.url),
);
const airportMapPath = fileURLToPath(new URL("./AirportMap.tsx", import.meta.url));
const markerPath = fileURLToPath(
  new URL("./UserLocationMarker.tsx", import.meta.url),
);
const enPath = fileURLToPath(new URL("../../config/i18n/en.ts", import.meta.url));
const zhPath = fileURLToPath(
  new URL("../../config/i18n/zh-CN.ts", import.meta.url),
);

const explorerSource = readFileSync(explorerPath, "utf8");
const drawerSource = readFileSync(drawerPath, "utf8");
const airportMapSource = readFileSync(airportMapPath, "utf8");
const markerSource = readFileSync(markerPath, "utf8");
const enSource = readFileSync(enPath, "utf8");
const zhSource = readFileSync(zhPath, "utf8");

assert.match(
  explorerSource,
  /resolveNextUserLocationAudioMode\(\{[\s\S]*?mode: userLocationMode,[\s\S]*?hasLocation: Boolean\(userLocation\),[\s\S]*?\}\)/,
  "user location control should resolve the next three-state location/audio mode before requesting geolocation",
);
assert.match(
  drawerSource,
  /mapLayers\.hideUserLocation/,
  "audio-enabled user location button should be labeled as a hide action",
);
assert.match(
  drawerSource,
  /mapLayers\.enableUserLocationAudio/,
  "location-on user location button should offer the aircraft proximity sound state",
);
assert.match(
  explorerSource,
  /cue: userLocationAudioCue/,
  "airport explorer should keep the proximity audio cue available for synchronized map motion",
);
assert.match(
  explorerSource,
  /userLocationAudioCue\?\.intervalMs/,
  "airport explorer should pass the active proximity interval into the map",
);
assert.match(
  explorerSource,
  /pulseBeat: userLocationPulseBeat/,
  "airport explorer should use the audio hook's beat as the synchronized pulse source",
);
assert.match(
  airportMapSource,
  /<UserLocationMarker[\s\S]*?pulseIntervalMs=\{userLocationPulseIntervalMs\}[\s\S]*?\/>/,
  "airport map should pass the proximity cue interval into the user location marker",
);
assert.match(
  airportMapSource,
  /pulseBeat=\{userLocationPulseBeat\}/,
  "airport map should pass the audio beat into the user location marker",
);
assert.match(
  markerSource,
  /--user-location-pulse-duration/,
  "user location marker should expose a CSS animation duration tied to the proximity cue",
);
assert.match(
  markerSource,
  /key=\{pulseBeat \|\| "idle"\}/,
  "user location marker should restart the pulse animation from the audio beat",
);
assert.doesNotMatch(
  drawerSource,
  /mapLayers\.updateUserLocation/,
  "active user location button should not be presented as an update-only action",
);
assert.match(
  enSource,
  /enableUserLocationAudio: "Enable aircraft proximity sound"/,
  "English copy should expose the aircraft proximity sound action",
);
assert.match(
  enSource,
  /hideUserLocation: "Hide my location"/,
  "English copy should expose a hide-my-location action",
);
assert.match(
  zhSource,
  /enableUserLocationAudio: "开启飞机接近提示音"/,
  "Chinese copy should expose the aircraft proximity sound action",
);
assert.match(
  zhSource,
  /hideUserLocation: "隐藏我的位置"/,
  "Chinese copy should expose a hide-my-location action",
);

console.log("UserLocationControl.test.ts ok");
