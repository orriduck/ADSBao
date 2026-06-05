const RECOVERABLE_FAILURE_PATTERNS = [
  /webgl/i,
  /context creation/i,
  /maplibre/i,
];

const RECOVERABLE_TILE_ERROR_PATTERNS = [
  /AJAXError:\s*Failed to fetch/i,
  /Failed to fetch.*\.(pbf|png|jpg|jpeg|webp)/i,
  /tiles\.openfreemap\.org/i,
  /elevation-tiles-prod/i,
];

export function shouldAttemptMapLibreTiles({
  userAgent = "",
  webGlAvailable = true,
} = {}) {
  if (!webGlAvailable) return false;
  if (/HeadlessChrome/i.test(String(userAgent || ""))) return false;
  return true;
}

export function shouldLogMapTileLayerFailure(error) {
  const message = error?.message || String(error || "");
  return !RECOVERABLE_FAILURE_PATTERNS.some((pattern) => pattern.test(message));
}

export function shouldSuppressMapLibreTileError(event = {}) {
  const error = event?.error || event;
  const message = error?.message || String(error || "");
  return RECOVERABLE_TILE_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}
