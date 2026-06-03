import assert from "node:assert/strict";

import {
  clearAviationContextTileCache,
  getAirspaceTile,
  getNavaidCountTile,
} from "./aviationContextTile.mechanism";

clearAviationContextTileCache();

{
  let requestedBbox = null;
  const payload = await getAirspaceTile({
    tile: { z: 6, x: 18, y: 24 },
    altitudeFtMsl: 6500,
    airspaceRepository: {
      async readAirspacesInBounds({ bbox, altitudeFtMsl }) {
        requestedBbox = bbox;
        assert.equal(altitudeFtMsl, 6500);
        return [{ id: "asp-1", name: "BEDFORD CLASS D" }];
      },
    },
  });

  assert.equal(payload.cacheKey, "airspace:6:18:24:altitude-ft:6500");
  assert.equal(payload.source, "supabase");
  assert.deepEqual(payload.airspaces, [{ id: "asp-1", name: "BEDFORD CLASS D" }]);
  assert.ok(requestedBbox);
}

{
  clearAviationContextTileCache();
  const requestedAltitudes = [];
  const repository = {
    async readAirspacesInBounds({ altitudeFtMsl }) {
      requestedAltitudes.push(altitudeFtMsl);
      return [{ id: `asp-${altitudeFtMsl}`, name: `Altitude ${altitudeFtMsl}` }];
    },
  };

  const lowPayload = await getAirspaceTile({
    tile: { z: 6, x: 18, y: 24 },
    altitudeFtMsl: 1500,
    airspaceRepository: repository,
  });
  const highPayload = await getAirspaceTile({
    tile: { z: 6, x: 18, y: 24 },
    altitudeFtMsl: 8500,
    airspaceRepository: repository,
  });

  assert.deepEqual(requestedAltitudes, [1500, 8500]);
  assert.equal(lowPayload.cacheKey, "airspace:6:18:24:altitude-ft:1500");
  assert.equal(highPayload.cacheKey, "airspace:6:18:24:altitude-ft:8500");
  assert.equal(lowPayload.airspaces[0].id, "asp-1500");
  assert.equal(highPayload.airspaces[0].id, "asp-8500");
}

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
