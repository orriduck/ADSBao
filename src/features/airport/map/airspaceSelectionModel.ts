type ClientPoint = {
  x: number;
  y: number;
};

type LatLngLike = {
  lat?: unknown;
  lng?: unknown;
};

type TouchLike = {
  clientX?: unknown;
  clientY?: unknown;
};

type PointerLike = TouchLike & {
  changedTouches?: ArrayLike<TouchLike>;
  touches?: ArrayLike<TouchLike>;
};

export function shouldHandleAirspaceSelection({
  visible = true,
  onSelectAirspace = null,
}: {
  visible?: boolean;
  onSelectAirspace?: unknown;
} = {}) {
  return visible === true && typeof onSelectAirspace === "function";
}

export function resolveAirspaceClientPoint(event?: PointerLike | null): ClientPoint | null {
  const directPoint = toClientPoint(event);
  if (directPoint) return directPoint;

  const changedTouch = event?.changedTouches?.[0];
  const changedPoint = toClientPoint(changedTouch);
  if (changedPoint) return changedPoint;

  return toClientPoint(event?.touches?.[0]);
}

export function resolveClickedAirspaceId({
  hitIds = [],
  features = [],
  latlng = null,
  clickedId = "",
  selectableAirspaceIds = new Set<string>(),
  selectedAirspaceId = "",
}: {
  hitIds?: string[];
  features?: Record<string, any>[];
  latlng?: LatLngLike | null;
  clickedId?: string;
  selectableAirspaceIds?: Set<string>;
  selectedAirspaceId?: string;
}) {
  const allAirspacesSelectable = selectableAirspaceIds.size === 0;
  const isSelectable = (id: string) =>
    Boolean(id) && (allAirspacesSelectable || selectableAirspaceIds.has(id));
  const overlappingIds = uniqueStrings([
    ...hitIds,
    ...airspaceFeatureIdsAtLatLng(features, latlng),
  ]);
  const normalizedClickedId = String(clickedId || "");

  if (!isSelectable(normalizedClickedId)) {
    return overlappingIds.find(isSelectable) || "";
  }

  if (!selectedAirspaceId || normalizedClickedId !== selectedAirspaceId) {
    return normalizedClickedId;
  }
  const nextId = overlappingIds.find((id) => id !== selectedAirspaceId && isSelectable(id));
  if (nextId) return nextId;
  const hasOverlappingAirspace = overlappingIds.some((id) => id !== selectedAirspaceId);
  return hasOverlappingAirspace ? "" : selectedAirspaceId;
}

export function airspaceFeatureIdsAtClientPoint(
  point?: ClientPoint | null,
  root: Document = document,
) {
  const x = Number(point?.x);
  const y = Number(point?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return [];
  return uniqueStrings(
    airspaceClientPointSamples(x, y).flatMap((sample) =>
      root
        .elementsFromPoint(sample.x, sample.y)
        .map((element) => element.getAttribute?.("data-airspace-feature-id") || "")
        .filter(Boolean),
    ),
  );
}

function toClientPoint(value?: TouchLike | null): ClientPoint | null {
  const x = Number(value?.clientX);
  const y = Number(value?.clientY);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}

function airspaceClientPointSamples(x: number, y: number) {
  const radius = 12;
  return [
    { x, y },
    { x: x - radius, y },
    { x: x + radius, y },
    { x, y: y - radius },
    { x, y: y + radius },
    { x: x - radius, y: y - radius },
    { x: x + radius, y: y - radius },
    { x: x - radius, y: y + radius },
    { x: x + radius, y: y + radius },
  ];
}

function airspaceFeatureIdsAtLatLng(
  features: Record<string, any>[],
  latlng?: LatLngLike | null,
) {
  const lat = Number(latlng?.lat);
  const lng = Number(latlng?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
  const point = [lng, lat];
  return features
    .filter((feature) => pointInGeoJsonGeometry(point, feature?.geometry))
    .map((feature) => String(feature?.properties?.id || ""))
    .filter(Boolean)
    .reverse();
}

function pointInGeoJsonGeometry(point: number[], geometry: Record<string, any> = {}) {
  if (geometry.type === "Polygon") {
    return pointInPolygon(point, geometry.coordinates);
  }
  if (geometry.type === "MultiPolygon") {
    return Array.isArray(geometry.coordinates) &&
      geometry.coordinates.some((polygon: number[][][]) =>
        pointInPolygon(point, polygon),
      );
  }
  return false;
}

function pointInPolygon(point: number[], rings: number[][][] = []) {
  if (!rings.length || !pointInRing(point, rings[0])) return false;
  return !rings.slice(1).some((ring) => pointInRing(point, ring));
}

function pointInRing([x, y]: number[], ring: number[][] = []) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}
