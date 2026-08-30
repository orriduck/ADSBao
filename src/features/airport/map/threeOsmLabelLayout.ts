export type ThreeOsmLabelCandidate = {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  priority: number;
  pinToViewport?: boolean;
};

export type ThreeOsmPlacedLabel = ThreeOsmLabelCandidate & {
  left: number;
  top: number;
  right: number;
  bottom: number;
  placement:
    | "top-right"
    | "top-left"
    | "bottom-right"
    | "bottom-left"
    | "edge";
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
    const minimumTop = Math.max(padding, reservedTop);
    const maximumBottom = viewportHeight - Math.max(padding, reservedBottom);
    const canPlace = (placement: ThreeOsmPlacedLabel) => {
      const outsideViewport =
        placement.left < padding ||
        placement.right > viewportWidth - padding ||
        placement.top < minimumTop ||
        placement.bottom > maximumBottom;
      return (
        !outsideViewport &&
        !blocked.some((item) => intersects(item, placement)) &&
        !placed.some((item) => intersects(item, placement))
      );
    };
    let next = resolveCandidatePlacements(candidate)
      .map(({ left, top, placement }): ThreeOsmPlacedLabel => ({
        ...candidate,
        placement,
        left,
        top,
        right: left + candidate.width,
        bottom: top + candidate.height,
      }))
      .find(canPlace);
    if (!next && candidate.pinToViewport) {
      const maximumLeft = Math.max(padding, viewportWidth - padding - candidate.width);
      const maximumTop = Math.max(minimumTop, maximumBottom - candidate.height);
      const baseLeft = Math.max(
        padding,
        Math.min(maximumLeft, candidate.x + 8),
      );
      const baseTop = Math.max(
        minimumTop,
        Math.min(maximumTop, candidate.y + 5),
      );
      const clampLeft = (value: number) =>
        Math.max(padding, Math.min(maximumLeft, value));
      const clampTop = (value: number) =>
        Math.max(minimumTop, Math.min(maximumTop, value));
      const fallbackPositions = [
        { left: baseLeft, top: baseTop },
        ...blocked.flatMap((item) => [
          { left: item.right + 8, top: baseTop },
          { left: item.left - candidate.width - 8, top: baseTop },
          { left: baseLeft, top: item.bottom + 5 },
          { left: baseLeft, top: item.top - candidate.height - 5 },
        ]),
      ]
        .map(({ left, top }) => ({
          left: clampLeft(left),
          top: clampTop(top),
        }))
        .filter(
          (item, index, items) =>
            items.findIndex(
              (candidateItem) =>
                candidateItem.left === item.left && candidateItem.top === item.top,
            ) === index,
        )
        .sort(
          (left, right) =>
            (left.left - baseLeft) ** 2 + (left.top - baseTop) ** 2 -
              ((right.left - baseLeft) ** 2 + (right.top - baseTop) ** 2),
        );
      next = fallbackPositions
        .map(({ left, top }): ThreeOsmPlacedLabel => ({
          ...candidate,
          placement: "edge",
          left,
          top,
          right: left + candidate.width,
          bottom: top + candidate.height,
        }))
        .find(canPlace);
    }
    if (next) placed.push(next);
  }

  return placed;
}
