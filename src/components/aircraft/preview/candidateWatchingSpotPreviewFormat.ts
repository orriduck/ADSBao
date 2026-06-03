import { toFiniteNumber } from "@/utils/math";

export function formatCandidateWatchingSpotName(
  spot: Record<string, any> | null | undefined,
  fallbackName: string,
) {
  return String(spot?.name || spot?.category || fallbackName).trim();
}

export function formatCandidateWatchingSpotCategory(
  spot: Record<string, any> | null | undefined,
) {
  const rawCategory = String(spot?.category || "").trim();
  if (rawCategory) return formatCategoryLabel(rawCategory);

  const tags = spot?.osmTags || {};
  const tagKey = [
    "tourism",
    "leisure",
    "amenity",
    "highway",
    "man_made",
    "public_transport",
    "landuse",
  ].find((key) => tags[key]);
  return tagKey ? formatCategoryLabel(String(tags[tagKey])) : "";
}

export function formatCandidateWatchingSpotDistance(
  spot: Record<string, any> | null | undefined,
  t: (key: string, params?: Record<string, unknown>) => string,
) {
  const distance = toFiniteNumber(spot?.distanceMeters);
  if (distance == null) return "";
  return t("watcherMode.distanceMeters", { distance: Math.round(distance) });
}

function formatCategoryLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim();
}
