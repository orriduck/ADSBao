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
