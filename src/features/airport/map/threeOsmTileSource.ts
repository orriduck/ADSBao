import type { TileCoordinate } from "./threeOsmProjection";

export type ThreeOsmTileSource = {
  id: string;
  attribution: string;
  buildUrl: (tile: TileCoordinate) => string;
};

export const THREE_OSM_STANDARD_TILE_SOURCE: ThreeOsmTileSource = {
  id: "osm-standard",
  attribution: "© OpenStreetMap contributors",
  buildUrl: (tile) =>
    `https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`,
};

export const THREE_OSM_DEBUG_FAILURE_TILE_SOURCE: ThreeOsmTileSource = {
  id: "debug-failure",
  attribution: "Debug tile failure",
  buildUrl: (tile) =>
    `/__three-osm-debug-missing__/${tile.z}/${tile.x}/${tile.y}.png`,
};
