export type ThreeOsmVectorSemanticLodId =
  | "overview"
  | "regional"
  | "approach"
  | "detail";

export type ThreeOsmVectorSemanticLod = {
  id: ThreeOsmVectorSemanticLodId;
  sourceZoom: number;
  roadClasses: readonly string[];
  surfaceKinds: readonly ThreeOsmVectorSurfaceKind[];
  showBuildings: boolean;
  maxLabels: number;
};

const OVERVIEW_ROADS = ["motorway", "trunk", "primary"] as const;
const REGIONAL_ROADS = [...OVERVIEW_ROADS, "secondary"] as const;
const APPROACH_ROADS = [...REGIONAL_ROADS, "tertiary"] as const;
const DETAIL_ROADS = [
  ...APPROACH_ROADS,
  "minor",
  "busway",
  "bridge",
  "service",
  "pier",
] as const;

export function resolveThreeOsmVectorSemanticLod(
  sourceZoom: number,
): ThreeOsmVectorSemanticLod {
  const zoom = Math.round(Number(sourceZoom) || 10);
  if (zoom <= 10) {
    return {
      id: "overview",
      sourceZoom: zoom,
      roadClasses: OVERVIEW_ROADS,
      surfaceKinds: ["aeroway"],
      showBuildings: false,
      maxLabels: 28,
    };
  }
  if (zoom === 11) {
    return {
      id: "regional",
      sourceZoom: zoom,
      roadClasses: REGIONAL_ROADS,
      surfaceKinds: ["water", "natural", "aeroway"],
      showBuildings: false,
      maxLabels: 36,
    };
  }
  if (zoom === 12) {
    return {
      id: "approach",
      sourceZoom: zoom,
      roadClasses: APPROACH_ROADS,
      surfaceKinds: ["water", "natural", "developed", "aeroway"],
      showBuildings: false,
      maxLabels: 42,
    };
  }
  return {
    id: "detail",
    sourceZoom: zoom,
    roadClasses: DETAIL_ROADS,
    surfaceKinds: ["water", "natural", "developed", "aeroway"],
    showBuildings: true,
    maxLabels: 48,
  };
}

export function isThreeOsmVectorRoadClassVisible({
  className,
  lod,
}: {
  className: string;
  lod: ThreeOsmVectorSemanticLod;
}) {
  return lod.roadClasses.includes(className.trim().toLowerCase());
}

export function isThreeOsmVectorSurfaceKindVisible({
  kind,
  lod,
}: {
  kind: ThreeOsmVectorSurfaceKind;
  lod: ThreeOsmVectorSemanticLod;
}) {
  return lod.surfaceKinds.includes(kind);
}

export function resolveThreeOsmVectorTileRadius({
  sourceZoom,
  rasterTileRadius,
}: {
  sourceZoom: number;
  rasterTileRadius: number;
}) {
  const boundedRasterRadius = Math.min(
    2,
    Math.max(1, Math.round(Number(rasterTileRadius) || 1)),
  );
  return sourceZoom <= 11 ? boundedRasterRadius : 1;
}
import type { ThreeOsmVectorSurfaceKind } from "./threeOsmVectorSurfaceModel";
