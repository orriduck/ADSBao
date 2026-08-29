import assert from "node:assert/strict";
import { lonLatToTileCoordinate } from "./threeOsmProjection";
import { createThreeOsmTraceScene } from "./threeOsmTraceScene";

const scene = createThreeOsmTraceScene({
  traces: [
    {
      aircraftHex: "abc123",
      tracePoints: [
        { lat: 42.34, lon: -71.04, altitude: 2_000 },
        { lat: 42.36, lon: -71.01, altitude: 3_000 },
        { lat: 42.38, lon: -70.98, altitude: 4_000 },
      ],
    },
    { aircraftHex: "empty", tracePoints: [{ lat: 42.3, lon: -71 }] },
  ],
  tileCenter: lonLatToTileCoordinate(-71.0096, 42.3656, 10),
  centerLat: 42.3656,
  theme: "dark",
});

assert.equal(scene.traceCount, 1);
assert.equal(scene.pointCount, 3);
assert.ok(scene.group.getObjectByName("three-osm-trace:abc123"));
assert.equal(scene.group.children.length, 3);

console.log("threeOsmTraceScene.test.ts ok");
