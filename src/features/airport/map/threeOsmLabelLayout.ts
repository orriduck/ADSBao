export type ThreeOsmLabelCandidate = {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  priority: number;
};

export type ThreeOsmPlacedLabel = ThreeOsmLabelCandidate & {
  left: number;
  top: number;
  right: number;
  bottom: number;
  placement: "top-right" | "top-left" | "bottom-right" | "bottom-left";
};

const intersects = (left: ThreeOsmPlacedLabel, right: ThreeOsmPlacedLabel) =>
  left.left < right.right &&
  left.right > right.left &&
  left.top < right.bottom &&
  left.bottom > right.top;

function resolveCandidatePlacements(candidate: ThreeOsmLabelCandidate) {
  const horizontalGap = 8;
  const verticalGap = 5;
  return [
    {
      placement: "top-right" as const,
      left: candidate.x + horizontalGap,
      top: candidate.y - candidate.height - verticalGap,
    },
    {
      placement: "top-left" as const,
      left: candidate.x - candidate.width - horizontalGap,
      top: candidate.y - candidate.height - verticalGap,
    },
    {
      placement: "bottom-right" as const,
      left: candidate.x + horizontalGap,
      top: candidate.y + verticalGap,
    },
    {
      placement: "bottom-left" as const,
      left: candidate.x - candidate.width - horizontalGap,
      top: candidate.y + verticalGap,
    },
  ];
}

export function layoutThreeOsmLabels(
  candidates: ThreeOsmLabelCandidate[],
  {
    viewportWidth,
    viewportHeight,
    maxLabels = 48,
    padding = 4,
    reservedTop = 0,
    reservedBottom = 0,
    blocked = [],
  }: {
    viewportWidth: number;
    viewportHeight: number;
    maxLabels?: number;
    padding?: number;
    reservedTop?: number;
    reservedBottom?: number;
    blocked?: ThreeOsmPlacedLabel[];
  },
) {
  const placed: ThreeOsmPlacedLabel[] = [];
  const sorted = [...candidates].sort(
    (left, right) => right.priority - left.priority || left.id.localeCompare(right.id),
  );

  for (const candidate of sorted) {
    if (placed.length >= maxLabels) break;
    const next = resolveCandidatePlacements(candidate)
      .map(({ left, top, placement }): ThreeOsmPlacedLabel => ({
        ...candidate,
        placement,
        left,
        top,
        right: left + candidate.width,
        bottom: top + candidate.height,
      }))
      .find((placement) => {
        const outsideViewport =
          placement.left < padding ||
          placement.right > viewportWidth - padding ||
          placement.top < Math.max(padding, reservedTop) ||
          placement.bottom > viewportHeight - Math.max(padding, reservedBottom);
        return (
          !outsideViewport &&
          !blocked.some((item) => intersects(item, placement)) &&
          !placed.some((item) => intersects(item, placement))
        );
      });
    if (next) placed.push(next);
  }

  return placed;
}
