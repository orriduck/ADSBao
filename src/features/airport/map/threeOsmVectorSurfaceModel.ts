export type ThreeOsmVectorSurfaceKind =
  | "water"
  | "natural"
  | "developed"
  | "aeroway";

const NATURAL_CLASSES = new Set([
  "farmland",
  "grass",
  "ice",
  "rock",
  "sand",
  "wetland",
  "wood",
]);

const DEVELOPED_CLASSES = new Set([
  "bus_station",
  "college",
  "commercial",
  "garages",
  "hospital",
  "industrial",
  "kindergarten",
  "library",
  "neighbourhood",
  "quarter",
  "railway",
  "residential",
  "retail",
  "school",
  "suburb",
  "university",
]);

const AEROWAY_CLASSES = new Set([
  "aerodrome",
  "apron",
  "helipad",
  "heliport",
  "runway",
  "taxiway",
]);

export function classifyThreeOsmVectorSurface({
  layerName,
  className,
  geometryType,
  sourceZoom,
}: {
  layerName: string;
  className: string;
  geometryType: number;
  sourceZoom: number;
}): ThreeOsmVectorSurfaceKind | null {
  const normalizedClass = className.trim().toLowerCase();
  if (layerName === "water") {
    return geometryType === 3 ? "water" : null;
  }
  if (layerName === "landcover") {
    return geometryType === 3 && NATURAL_CLASSES.has(normalizedClass)
      ? "natural"
      : null;
  }
  if (layerName === "landuse") {
    return sourceZoom >= 11 &&
      geometryType === 3 &&
      DEVELOPED_CLASSES.has(normalizedClass)
      ? "developed"
      : null;
  }
  if (layerName === "aeroway") {
    return sourceZoom >= 10 &&
      (geometryType === 2 || geometryType === 3) &&
      AEROWAY_CLASSES.has(normalizedClass)
      ? "aeroway"
      : null;
  }
  return null;
}
