import type { ThreeOsmSceneLabel } from "./threeOsmSceneContext";

export type ThreeOsmLabelPresentation = {
  mode: "halo" | "sign";
  tone: "semantic" | "focal" | "operational" | "context" | "selected";
  fontSizePx: 9 | 10 | 12;
  fontWeight: 600 | 700;
  heightPx: 16 | 18 | 22;
  horizontalPaddingPx: 6 | 8 | 12;
  opacity: number;
};

const VECTOR_LABEL_KINDS = new Set<ThreeOsmSceneLabel["kind"]>([
  "vector-aerodrome",
  "vector-place",
  "vector-road",
  "vector-water",
]);

export function isThreeOsmVectorLabelKind(
  kind: ThreeOsmSceneLabel["kind"],
) {
  return VECTOR_LABEL_KINDS.has(kind);
}

export function resolveThreeOsmLabelPresentation(
  label: Pick<ThreeOsmSceneLabel, "kind" | "selected">,
): ThreeOsmLabelPresentation {
  if (label.kind === "focal-airport") {
    return {
      mode: "sign",
      tone: "focal",
      fontSizePx: 12,
      fontWeight: 700,
      heightPx: 22,
      horizontalPaddingPx: 12,
      opacity: 1,
    };
  }

  if (isThreeOsmVectorLabelKind(label.kind)) {
    const prominent =
      label.kind === "vector-aerodrome" || label.kind === "vector-place";
    return {
      mode: "halo",
      tone: "semantic",
      fontSizePx: prominent ? 10 : 9,
      fontWeight: label.kind === "vector-aerodrome" ? 700 : 600,
      heightPx: 16,
      horizontalPaddingPx: 6,
      opacity:
        label.kind === "vector-water"
          ? 0.72
          : label.kind === "vector-road"
            ? 0.84
            : 0.94,
    };
  }

  if (label.kind === "aircraft" && !label.selected) {
    return {
      mode: "halo",
      tone: "context",
      fontSizePx: 9,
      fontWeight: 600,
      heightPx: 16,
      horizontalPaddingPx: 6,
      opacity: 0.96,
    };
  }

  if (label.kind === "airport") {
    return {
      mode: "sign",
      tone: "operational",
      fontSizePx: 9,
      fontWeight: 700,
      heightPx: 16,
      horizontalPaddingPx: 8,
      opacity: 1,
    };
  }

  if (label.kind === "runway") {
    return {
      mode: "sign",
      tone: "operational",
      fontSizePx: 10,
      fontWeight: 700,
      heightPx: 18,
      horizontalPaddingPx: 12,
      opacity: 1,
    };
  }

  return {
    mode: "sign",
    tone: label.selected ? "selected" : "context",
    fontSizePx: 9,
    fontWeight: 600,
    heightPx: 18,
    horizontalPaddingPx: 12,
    opacity: 1,
  };
}
