export const THREE_OSM_CONTEXT_KINDS = [
  "airport",
  "navaid",
  "reporting",
  "spot",
] as const;

export type ThreeOsmContextKind = (typeof THREE_OSM_CONTEXT_KINDS)[number];

export function selectThreeOsmDebugContextTargets<
  Target extends { key: string; kind: ThreeOsmContextKind },
>(targets: Target[], limit = 8) {
  const boundedLimit = Math.max(0, Math.trunc(limit));
  if (!boundedLimit || !targets.length) return [];

  const selected: Target[] = [];
  const selectedKeys = new Set<string>();
  for (const kind of THREE_OSM_CONTEXT_KINDS) {
    if (selected.length >= boundedLimit) break;
    const representative = targets.find((target) => target.kind === kind);
    if (!representative || selectedKeys.has(representative.key)) continue;
    selected.push(representative);
    selectedKeys.add(representative.key);
  }

  for (const target of targets) {
    if (selected.length >= boundedLimit) break;
    if (selectedKeys.has(target.key)) continue;
    selected.push(target);
    selectedKeys.add(target.key);
  }

  return selected;
}
