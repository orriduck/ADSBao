import type { ThreeOsmVectorSemanticLodId } from "./threeOsmVectorSemanticLod";

type ThreeOsmSceneSemanticLodId = ThreeOsmVectorSemanticLodId;

export type ThreeOsmSceneSemanticLod = {
  id: ThreeOsmSceneSemanticLodId;
  sourceZoom: number;
  rasterUnderlayStrength: number;
  roadStrength: number;
  labelBudgets: {
    compact: number;
    desktop2d: number;
    desktop3d: number;
  };
};

const PROFILES: Record<
  10 | 11 | 12 | 13 | 14,
  Omit<ThreeOsmSceneSemanticLod, "sourceZoom">
> = {
  10: {
    id: "overview",
    rasterUnderlayStrength: 0.96,
    roadStrength: 0.22,
    labelBudgets: { compact: 2, desktop2d: 8, desktop3d: 6 },
  },
  11: {
    id: "regional",
    rasterUnderlayStrength: 0.92,
    roadStrength: 0.3,
    labelBudgets: { compact: 3, desktop2d: 10, desktop3d: 8 },
  },
  12: {
    id: "approach",
    rasterUnderlayStrength: 0.96,
    roadStrength: 0.46,
    labelBudgets: { compact: 4, desktop2d: 12, desktop3d: 9 },
  },
  13: {
    id: "detail",
    rasterUnderlayStrength: 0.95,
    roadStrength: 0.58,
    labelBudgets: { compact: 4, desktop2d: 14, desktop3d: 10 },
  },
  14: {
    id: "detail",
    rasterUnderlayStrength: 1,
    roadStrength: 0.72,
    labelBudgets: { compact: 4, desktop2d: 14, desktop3d: 10 },
  },
};

export function resolveThreeOsmSceneSemanticLod(
  sourceZoom: number,
): ThreeOsmSceneSemanticLod {
  const zoom = Math.min(14, Math.max(10, Math.round(Number(sourceZoom) || 10)));
  const profile = PROFILES[zoom as keyof typeof PROFILES];
  return { ...profile, sourceZoom: zoom };
}

export function resolveThreeOsmSceneVectorLabelBudget({
  sourceZoom,
  compact,
  viewMode,
}: {
  sourceZoom: number;
  compact: boolean;
  viewMode: "2d" | "3d";
}) {
  const budgets = resolveThreeOsmSceneSemanticLod(sourceZoom).labelBudgets;
  if (compact) return budgets.compact;
  return viewMode === "3d" ? budgets.desktop3d : budgets.desktop2d;
}
