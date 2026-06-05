export function formatNearbyDistanceDisplay(distanceNm: unknown) {
  if (distanceNm == null || distanceNm === "") return null;
  const distance = Number(distanceNm);
  if (!Number.isFinite(distance)) return null;
  const rounded = Math.max(0, Math.round(distance));
  if (rounded < 1) {
    return { value: null, unit: "NM", text: "<1" };
  }
  return { value: rounded, unit: "NM", text: null };
}
