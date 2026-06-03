import assert from "node:assert/strict";

import {
  clearAviationContextTileCache,
  getNavaidCountTile,
} from "./aviationContextTile.mechanism";

clearAviationContextTileCache();

{
  let requestedBbox = null;
  const payload = await getNavaidCountTile({
    tile: { z: 6, x: 18, y: 24 },
    facilityRepository: {
      async readNavaidCountInBounds({ bbox }) {
        requestedBbox = bbox;
        return 37;
      },
    },
  });

  assert.equal(payload.cacheKey, "navaid-counts:6:18:24");
  assert.equal(payload.source, "ourairports");
  assert.equal(payload.count, 37);
  assert.equal(payload.navaidCounts.length, 1);
  assert.equal(payload.navaidCounts[0].key, "navaid-counts:6:18:24");
  assert.equal(payload.navaidCounts[0].count, 37);
  assert.ok(Math.abs(payload.navaidCounts[0].lat - 38.7888935) < 0.000001);
  assert.equal(payload.navaidCounts[0].lon, -75.9375);
  assert.equal(payload.navaidCounts[0].z, 6);
  assert.equal(payload.navaidCounts[0].x, 18);
  assert.equal(payload.navaidCounts[0].y, 24);
  assert.ok(requestedBbox);
}

{
  const payload = await getNavaidCountTile({
    tile: { z: 6, x: 19, y: 24 },
    facilityRepository: {
      async readNavaidCountInBounds() {
        return 0;
      },
    },
  });

  assert.equal(payload.count, 0);
  assert.deepEqual(payload.navaidCounts, []);
}

console.log("aviationContextTile.mechanism.test.ts ok");
