type ContextRecord = Record<string, any>;

export const NAVAID_COUNT_MAX_DETAIL_ZOOM = 8;

const numberOrNull = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export function shouldUseNavaidCountTiles({
  fullTraceMode = false,
  zoom,
}: ContextRecord = {}) {
  const numericZoom = numberOrNull(zoom);
  return Boolean(
    fullTraceMode &&
      numericZoom != null &&
      numericZoom <= NAVAID_COUNT_MAX_DETAIL_ZOOM,
  );
}

export function buildNavaidCountMarker({
  tile,
  bbox,
  count,
}: ContextRecord = {}) {
  const numericCount = Math.trunc(Number(count));
  if (!Number.isFinite(numericCount) || numericCount <= 0) return null;
  const z = numberOrNull(tile?.z);
  const x = numberOrNull(tile?.x);
  const y = numberOrNull(tile?.y);
  const west = numberOrNull(bbox?.west);
  const east = numberOrNull(bbox?.east);
  const south = numberOrNull(bbox?.south);
  const north = numberOrNull(bbox?.north);
  if (
    z == null ||
    x == null ||
    y == null ||
    west == null ||
    east == null ||
    south == null ||
    north == null
  ) {
    return null;
  }

  return {
    key: `navaid-counts:${z}:${x}:${y}`,
    count: numericCount,
    lat: (south + north) / 2,
    lon: (west + east) / 2,
    z,
    x,
    y,
  };
}
