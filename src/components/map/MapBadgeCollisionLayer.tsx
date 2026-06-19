import { useEffect } from "react";
import { AIRPORT_MAP_PANES } from "@/config/airportMap";
import { useMapInstance } from "./MapContext";

const BADGE_SELECTOR = '[data-map-badge="true"]';
const STACK_GAP_PX = 6;
const COLLISION_PADDING_PX = 3;
const MAP_EDGE_MARGIN_PX = 8;

type BadgeItem = {
  element: HTMLElement;
  marker: HTMLElement | null;
  index: number;
  priority: number;
  rect: DOMRect;
};

export default function MapBadgeCollisionLayer({
  refreshKey = "",
}: {
  refreshKey?: string;
}) {
  const map = useMapInstance();

  useEffect(() => {
    if (!map?.getContainer || !map?.getPane) return undefined;

    let frame = 0;
    const schedule = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        layoutMapBadges(map);
      });
    };

    schedule();
    map.on("zoomend moveend resize layeradd layerremove", schedule);
    const pane = map.getPane(AIRPORT_MAP_PANES.badge.name);
    const observer = pane ? new MutationObserver(schedule) : null;
    observer?.observe(pane, {
      attributes: true,
      attributeFilter: ["class"],
      childList: true,
      characterData: true,
      subtree: true,
    });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer?.disconnect();
      map.off("zoomend moveend resize layeradd layerremove", schedule);
      resetMapBadges(map);
    };
  }, [map, refreshKey]);

  return null;
}

function layoutMapBadges(map: any) {
  resetMapBadges(map);
  const pane = map.getPane(AIRPORT_MAP_PANES.badge.name);
  const container = map.getContainer();
  if (!pane || !container) return;

  const mapRect = container.getBoundingClientRect();
  const badges = Array.from(pane.querySelectorAll(BADGE_SELECTOR))
    .filter(isVisibleBadge)
    .map((element, index) => {
      const badgeElement = element as HTMLElement;
      return {
        element: badgeElement,
        marker: badgeElement.closest(".leaflet-marker-icon") as HTMLElement | null,
        index,
        priority: badgePriority(badgeElement),
        rect: badgeElement.getBoundingClientRect(),
      };
    })
    .filter((badge) => badge.rect.width > 0 && badge.rect.height > 0);

  for (const group of collisionGroups(badges)) {
    applyStack(group, mapRect);
  }
}

function resetMapBadges(map: any) {
  const pane = map?.getPane?.(AIRPORT_MAP_PANES.badge.name);
  if (!pane) return;
  pane.querySelectorAll(BADGE_SELECTOR).forEach((element: Element) => {
    const badge = element as HTMLElement;
    badge.style.setProperty("--map-badge-offset-x", "0px");
    badge.style.setProperty("--map-badge-offset-y", "0px");
    badge.style.setProperty("--map-badge-stack-z", "0");
    const marker = badge.closest(".leaflet-marker-icon") as HTMLElement | null;
    hideBadgeLeader(marker);
    restoreMarkerZIndex(marker);
  });
}

function isVisibleBadge(element: Element) {
  const badge = element as HTMLElement;
  const rect = badge.getBoundingClientRect();
  const style = window.getComputedStyle(badge);
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== "none" &&
    style.visibility !== "hidden"
  );
}

function badgePriority(element: HTMLElement) {
  const type = element.dataset.mapBadgeType || "";
  if (type === "airport") return 90;
  if (type === "nearby-airport") return 70;
  if (type === "reporting-point") return 60;
  if (type === "navaid") return 60;
  return 50;
}

function collisionGroups(items: BadgeItem[]) {
  const parent = items.map((_, index) => index);
  const find = (index: number): number => {
    if (parent[index] !== index) parent[index] = find(parent[index]);
    return parent[index];
  };
  const union = (a: number, b: number) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent[rootB] = rootA;
  };

  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      if (rectsOverlap(items[i].rect, items[j].rect)) union(i, j);
    }
  }

  const groups = new Map<number, BadgeItem[]>();
  items.forEach((item, index) => {
    const root = find(index);
    const group = groups.get(root) || [];
    group.push(item);
    groups.set(root, group);
  });
  return Array.from(groups.values()).filter((group) => group.length > 1);
}

function rectsOverlap(a: DOMRectLike, b: DOMRectLike) {
  return !(
    a.right + COLLISION_PADDING_PX < b.left ||
    b.right + COLLISION_PADDING_PX < a.left ||
    a.bottom + COLLISION_PADDING_PX < b.top ||
    b.bottom + COLLISION_PADDING_PX < a.top
  );
}

function applyStack(group: BadgeItem[], mapRect: DOMRect) {
  const sorted = [...group].sort(
    (a, b) =>
      b.priority - a.priority ||
      a.rect.top - b.rect.top ||
      a.rect.left - b.rect.left ||
      a.index - b.index,
  );
  const rowHeight = Math.max(...sorted.map((item) => item.rect.height)) + STACK_GAP_PX;
  const placedRects: DOMRectLike[] = [];

  sorted.forEach((badge, rank) => {
    const offsetY = rank === 0
      ? 0
      : stackOffsetForRank({
          placedRects,
          rank,
          rowHeight,
          rect: badge.rect,
          mapRect,
        });
    badge.element.style.setProperty("--map-badge-offset-x", "0px");
    badge.element.style.setProperty("--map-badge-offset-y", `${Math.round(offsetY)}px`);
    const zIndex = 1000 + rank;
    badge.element.style.setProperty("--map-badge-stack-z", String(zIndex));
    setMarkerZIndex(badge.marker, zIndex);
    updateBadgeLeader(badge, offsetY);
    placedRects.push(offsetRectY(badge.rect, offsetY));
  });
}

function stackOffsetForRank({
  placedRects,
  rank,
  rowHeight,
  rect,
  mapRect,
}: {
  placedRects: DOMRectLike[];
  rank: number;
  rowHeight: number;
  rect: DOMRect;
  mapRect: DOMRect;
}) {
  const level = Math.ceil(rank / 2);
  const preferredDirection = rank % 2 === 1 ? 1 : -1;
  const preferred = resolvedDirectionalOffset({
    direction: preferredDirection,
    fallback: preferredDirection * level * rowHeight,
    placedRects,
    rect,
  });
  const flipped = resolvedDirectionalOffset({
    direction: -preferredDirection,
    fallback: -preferredDirection * level * rowHeight,
    placedRects,
    rect,
  });

  if (fitsMapY(rect, preferred, mapRect) && clearsPlacedRects(rect, preferred, placedRects)) {
    return preferred;
  }
  if (fitsMapY(rect, flipped, mapRect) && clearsPlacedRects(rect, flipped, placedRects)) {
    return flipped;
  }
  return clampMapY(rect, preferred, mapRect);
}

type DOMRectLike = Pick<DOMRect, "bottom" | "height" | "left" | "right" | "top" | "width">;

function resolvedDirectionalOffset({
  direction,
  fallback,
  placedRects,
  rect,
}: {
  direction: number;
  fallback: number;
  placedRects: DOMRectLike[];
  rect: DOMRect;
}) {
  if (!placedRects.length) return fallback;
  if (direction > 0) {
    const bottom = Math.max(...placedRects.map((placed) => placed.bottom));
    return Math.max(fallback, bottom + STACK_GAP_PX - rect.top);
  }
  const top = Math.min(...placedRects.map((placed) => placed.top));
  return Math.min(fallback, top - STACK_GAP_PX - rect.bottom);
}

function clearsPlacedRects(rect: DOMRect, offsetY: number, placedRects: DOMRectLike[]) {
  const shifted = offsetRectY(rect, offsetY);
  return placedRects.every((placed) => !rectsOverlap(shifted, placed));
}

function offsetRectY(rect: DOMRect, offsetY: number): DOMRectLike {
  return {
    bottom: rect.bottom + offsetY,
    height: rect.height,
    left: rect.left,
    right: rect.right,
    top: rect.top + offsetY,
    width: rect.width,
  };
}

function fitsMapY(rect: DOMRect, offsetY: number, mapRect: DOMRect) {
  return (
    rect.top + offsetY >= mapRect.top + MAP_EDGE_MARGIN_PX &&
    rect.bottom + offsetY <= mapRect.bottom - MAP_EDGE_MARGIN_PX
  );
}

function clampMapY(rect: DOMRect, offsetY: number, mapRect: DOMRect) {
  const minOffset = mapRect.top + MAP_EDGE_MARGIN_PX - rect.top;
  const maxOffset = mapRect.bottom - MAP_EDGE_MARGIN_PX - rect.bottom;
  return Math.min(maxOffset, Math.max(minOffset, offsetY));
}

function setMarkerZIndex(marker: HTMLElement | null, zIndex: number) {
  if (!marker) return;
  if (marker.dataset.mapBadgeOriginalZIndex == null) {
    marker.dataset.mapBadgeOriginalZIndex = marker.style.zIndex || "";
  }
  marker.style.zIndex = String(zIndex);
}

function restoreMarkerZIndex(marker: HTMLElement | null) {
  if (!marker || marker.dataset.mapBadgeOriginalZIndex == null) return;
  marker.style.zIndex = marker.dataset.mapBadgeOriginalZIndex;
  delete marker.dataset.mapBadgeOriginalZIndex;
}

function updateBadgeLeader(badge: BadgeItem, offsetY: number) {
  if (!badge.marker || Math.abs(offsetY) < 1) {
    hideBadgeLeader(badge.marker);
    return;
  }

  const markerRect = badge.marker.getBoundingClientRect();
  const start = resolveLeaderStartPoint(badge, markerRect);
  const end = {
    x: badge.rect.left - markerRect.left + badge.rect.width / 2,
    y: badge.rect.top - markerRect.top + offsetY + badge.rect.height / 2,
  };
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (!Number.isFinite(length) || length < 2) {
    hideBadgeLeader(badge.marker);
    return;
  }

  const leader = ensureBadgeLeader(badge.marker);
  leader.style.display = "block";
  leader.style.left = `${Math.round(start.x)}px`;
  leader.style.top = `${Math.round(start.y)}px`;
  leader.style.width = `${Math.round(length)}px`;
  leader.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
}

function resolveLeaderStartPoint(badge: BadgeItem, markerRect: DOMRect) {
  const dot = badge.marker?.querySelector(".navaid-map-marker__dot");
  if (dot) {
    const dotRect = dot.getBoundingClientRect();
    return {
      x: dotRect.left - markerRect.left + dotRect.width / 2,
      y: dotRect.top - markerRect.top + dotRect.height / 2,
    };
  }
  return {
    x: badge.rect.left - markerRect.left + badge.rect.width / 2,
    y: badge.rect.top - markerRect.top + badge.rect.height / 2,
  };
}

function ensureBadgeLeader(marker: HTMLElement) {
  const existing = marker.querySelector(".map-badge-leader");
  if (existing instanceof HTMLElement) return existing;
  const leader = document.createElement("span");
  leader.className = "map-badge-leader";
  marker.prepend(leader);
  return leader;
}

function hideBadgeLeader(marker: HTMLElement | null) {
  const leader = marker?.querySelector(".map-badge-leader");
  if (!(leader instanceof HTMLElement)) return;
  leader.style.display = "none";
}
