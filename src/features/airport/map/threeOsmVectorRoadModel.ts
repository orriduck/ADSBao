export const THREE_OSM_ROAD_TIERS = [
  "motorway",
  "arterial",
  "collector",
  "local",
  "service",
] as const;

export type ThreeOsmRoadTier = (typeof THREE_OSM_ROAD_TIERS)[number];
