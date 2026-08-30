export type ThreeOsmCorridorPoint = { x: number; z: number };

export function pushThreeOsmCorridorQuad(
  positions: number[],
  from: ThreeOsmCorridorPoint,
  to: ThreeOsmCorridorPoint,
  width: number,
  y: number,
) {
  const deltaX = to.x - from.x;
  const deltaZ = to.z - from.z;
  const length = Math.hypot(deltaX, deltaZ);
  if (!length) return false;
  const halfWidth = width / 2;
  const offsetX = (-deltaZ / length) * halfWidth;
  const offsetZ = (deltaX / length) * halfWidth;
  positions.push(
    from.x + offsetX, y, from.z + offsetZ,
    from.x - offsetX, y, from.z - offsetZ,
    to.x + offsetX, y, to.z + offsetZ,
    to.x + offsetX, y, to.z + offsetZ,
    from.x - offsetX, y, from.z - offsetZ,
    to.x - offsetX, y, to.z - offsetZ,
  );
  return true;
}

export function pushThreeOsmDashedCorridor(
  positions: number[],
  from: ThreeOsmCorridorPoint,
  to: ThreeOsmCorridorPoint,
  {
    dash,
    gap,
    width,
    y,
  }: { dash: number; gap: number; width: number; y: number },
) {
  const startLength = positions.length;
  positions.push(
    ...buildThreeOsmDashedPolylineCorridor({
      points: [from, to],
      dash,
      gap,
      width,
      y,
    }),
  );
  return (positions.length - startLength) / 18;
}

export function buildThreeOsmDashedPolylineCorridor({
  points,
  dash,
  gap,
  width,
  y,
}: {
  points: ThreeOsmCorridorPoint[];
  dash: number;
  gap: number;
  width: number;
  y: number;
}) {
  const positions: number[] = [];
  const cycle = dash + gap;
  let pathDistance = 0;
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    const deltaX = to.x - from.x;
    const deltaZ = to.z - from.z;
    const length = Math.hypot(deltaX, deltaZ);
    if (!length) continue;
    const directionX = deltaX / length;
    const directionZ = deltaZ / length;
    const firstDash = Math.floor(pathDistance / cycle);
    const lastDash = Math.floor((pathDistance + length) / cycle);
    for (let dashIndex = firstDash; dashIndex <= lastDash; dashIndex += 1) {
      const dashStart = Math.max(0, dashIndex * cycle - pathDistance);
      const dashEnd = Math.min(
        length,
        dashIndex * cycle + dash - pathDistance,
      );
      if (dashEnd - dashStart >= 0.15) {
        pushThreeOsmCorridorQuad(
          positions,
          {
            x: from.x + directionX * dashStart,
            z: from.z + directionZ * dashStart,
          },
          {
            x: from.x + directionX * dashEnd,
            z: from.z + directionZ * dashEnd,
          },
          width,
          y,
        );
      }
    }
    pathDistance += length;
  }
  return positions;
}
