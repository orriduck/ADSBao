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
};

const intersects = (left: ThreeOsmPlacedLabel, right: ThreeOsmPlacedLabel) =>
  left.left < right.right &&
  left.right > right.left &&
  left.top < right.bottom &&
  left.bottom > right.top;

export function layoutThreeOsmLabels(
  candidates: ThreeOsmLabelCandidate[],
  {
    viewportWidth,
    viewportHeight,
    maxLabels = 48,
    padding = 4,
    reservedTop = 0,
    reservedBottom = 0,
  }: {
    viewportWidth: number;
    viewportHeight: number;
    maxLabels?: number;
    padding?: number;
    reservedTop?: number;
    reservedBottom?: number;
  },
) {
  const placed: ThreeOsmPlacedLabel[] = [];
  const sorted = [...candidates].sort(
    (left, right) => right.priority - left.priority || left.id.localeCompare(right.id),
  );

  for (const candidate of sorted) {
    if (placed.length >= maxLabels) break;
    const left = candidate.x + 8;
    const top = candidate.y - candidate.height - 5;
    const next: ThreeOsmPlacedLabel = {
      ...candidate,
      left,
      top,
      right: left + candidate.width,
      bottom: top + candidate.height,
    };
    const outsideViewport =
      next.left < padding ||
      next.right > viewportWidth - padding ||
      next.top < Math.max(padding, reservedTop) ||
      next.bottom > viewportHeight - Math.max(padding, reservedBottom);
    if (outsideViewport || placed.some((item) => intersects(item, next))) continue;
    placed.push(next);
  }

  return placed;
}
