import assert from "node:assert/strict";

import {
  AIRSPACE_TILE_CACHE_HEADERS,
  NAVAID_TILE_CACHE_HEADERS,
  WAYPOINT_TILE_CACHE_HEADERS,
  buildContextTileCacheKey,
  getContextTileNeighbors,
  normalizeContextTileParams,
  tileToBbox,
} from "./aviationContextTileModel";

{
  const tile = normalizeContextTileParams({ z: "8", x: "47", y: "94" });
  assert.deepEqual(tile, { z: 8, x: 47, y: 94 });
  assert.equal(normalizeContextTileParams({ z: "2", x: "8", y: "1" }), null);
  assert.equal(normalizeContextTileParams({ z: "19", x: "0", y: "0" }), null);
}

{
  const bbox = tileToBbox({ z: 2, x: 1, y: 1 });
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(bbox).map(([key, value]) => [key, Number(value.toFixed(6))]),
    ),
    {
      west: -90,
      south: 0,
      east: 0,
      north: 66.51326,
    },
  );
}

{
  assert.equal(
    buildContextTileCacheKey("airspace", { z: 8, x: 47, y: 94 }),
    "airspace:8:47:94",
  );
  assert.equal(
    AIRSPACE_TILE_CACHE_HEADERS["Cache-Control"],
    "public, max-age=0, s-maxage=1800, stale-while-revalidate=3600",
  );
  assert.equal(
    AIRSPACE_TILE_CACHE_HEADERS["CDN-Cache-Control"],
    "public, s-maxage=1800, stale-while-revalidate=3600",
  );
  assert.equal(
    AIRSPACE_TILE_CACHE_HEADERS["Vercel-CDN-Cache-Control"],
    "public, s-maxage=1800, stale-while-revalidate=3600",
  );
  assert.equal(
    NAVAID_TILE_CACHE_HEADERS["Cache-Control"],
    "public, max-age=0, s-maxage=2592000, stale-while-revalidate=604800",
  );
  assert.equal(
    NAVAID_TILE_CACHE_HEADERS["CDN-Cache-Control"],
    "public, s-maxage=2592000, stale-while-revalidate=604800",
  );
  assert.equal(
    NAVAID_TILE_CACHE_HEADERS["Vercel-CDN-Cache-Control"],
    "public, s-maxage=2592000, stale-while-revalidate=604800",
  );
  assert.equal(
    WAYPOINT_TILE_CACHE_HEADERS["Cache-Control"],
    "public, max-age=0, s-maxage=604800, stale-while-revalidate=86400",
  );
  assert.equal(
    WAYPOINT_TILE_CACHE_HEADERS["CDN-Cache-Control"],
    "public, s-maxage=604800, stale-while-revalidate=86400",
  );
  assert.equal(
    WAYPOINT_TILE_CACHE_HEADERS["Vercel-CDN-Cache-Control"],
    "public, s-maxage=604800, stale-while-revalidate=86400",
  );
}

{
  const neighbors = getContextTileNeighbors({ z: 3, x: 0, y: 4 }, 1);
  assert.deepEqual(
    neighbors.map((tile) => `${tile.z}/${tile.x}/${tile.y}`),
    ["3/0/3", "3/0/4", "3/0/5", "3/1/3", "3/1/4", "3/1/5"],
  );
}

console.log("aviationContextTileModel.test.ts ok");
