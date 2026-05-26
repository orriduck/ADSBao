const RECOVERABLE_FAILURE_PATTERNS = [
  /webgl/i,
  /context creation/i,
  /maplibre/i,
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
