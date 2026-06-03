import assert from "node:assert/strict";

import {
  buildNavaidCountMarker,
  shouldUseNavaidCountTiles,
} from "./aviationContextDisplayModel";

assert.equal(
  shouldUseNavaidCountTiles({ fullTraceMode: true, zoom: 6 }),
  true,
);
assert.equal(
  shouldUseNavaidCountTiles({ fullTraceMode: true, zoom: 9 }),
  false,
);
assert.equal(
  shouldUseNavaidCountTiles({ fullTraceMode: false, zoom: 6 }),
  false,
);

{
  assert.deepEqual(
    buildNavaidCountMarker({
      tile: { z: 6, x: 18, y: 24 },
      bbox: { west: -78.75, south: 36.597889, east: -73.125, north: 40.979898 },
      count: 37,
    }),
    {
      key: "navaid-counts:6:18:24",
      count: 37,
      lat: 38.7888935,
      lon: -75.9375,
      z: 6,
      x: 18,
      y: 24,
    },
  );
  assert.equal(buildNavaidCountMarker({ count: 0 }), null);
}

console.log("aviationContextDisplayModel.test.ts ok");
