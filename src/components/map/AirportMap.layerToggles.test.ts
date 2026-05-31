import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const airportMapPath = fileURLToPath(new URL("./AirportMap.tsx", import.meta.url));
const source = readFileSync(airportMapPath, "utf8");
const nearbyAirportLayerCall = source.match(
  /<NearbyAirportLayer[\s\S]*?\/>/,
)?.[0] || "";

assert.match(
  nearbyAirportLayerCall,
  /showRunwayBadges=\{false\}/,
  "nearby airport runway endpoint labels should stay hidden",
);

console.log("AirportMap.layerToggles.test.ts ok");
