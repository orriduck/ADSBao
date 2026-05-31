const SIDEBAR_SELECTOR = ".airport-desktop-sidebar";

function pair(value: any, fallback: number[]) {
  if (Array.isArray(value)) return value;
  if (value && typeof value.x === "number" && typeof value.y === "number") {
    return [value.x, value.y];
  }
  return fallback;
}

export function getFloatingSidebarOcclusionWidth(map: any) {
  const container = map?.getContainer?.();
  const kit = container?.closest?.(".airport-map-kit");
  const sidebar = kit?.querySelector?.(SIDEBAR_SELECTOR);
  if (!container || !sidebar) return 0;

  const containerRect = container.getBoundingClientRect();
  const sidebarRect = sidebar.getBoundingClientRect();
  if (sidebarRect.width < 1 || sidebarRect.height < 1) return 0;

  const occludedRight = Math.min(sidebarRect.right, containerRect.right);
  return Math.max(0, Math.round(occludedRight - containerRect.left));
}

export function getOffsetMapCenter(map: any, center: any, zoom: any) {
  const occlusionWidth = getFloatingSidebarOcclusionWidth(map);
  if (!occlusionWidth || !center) return center;

  const projected = map.project([center.lat, center.lon], zoom);
  projected.x -= occlusionWidth / 2;
  return map.unproject(projected, zoom);
}

export function withFloatingSidebarFitPadding(map: any, fitOptions: Record<string, any> = {}) {
  const occlusionWidth = getFloatingSidebarOcclusionWidth(map);
  if (!occlusionWidth) return fitOptions;

  const basePadding = pair(fitOptions.padding, [60, 60]);
  const topLeft = pair(fitOptions.paddingTopLeft, basePadding);
  const bottomRight = pair(fitOptions.paddingBottomRight, basePadding);

  return {
    ...fitOptions,
    paddingTopLeft: [topLeft[0] + occlusionWidth, topLeft[1]],
    paddingBottomRight: bottomRight,
  };
}
