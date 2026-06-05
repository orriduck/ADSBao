export function formatNearbyDistanceDisplay(distanceNm: unknown) {
  if (distanceNm == null || distanceNm === "") return null;
  const distance = Number(distanceNm);
  if (!Number.isFinite(distance)) return null;
  return {
    value: Math.max(0, Math.round(distance)),
    unit: "NM",
  };
}
