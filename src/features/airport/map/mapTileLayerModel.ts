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

type ErrorMessageLike = {
  message?: unknown;
};

type MapLibreTileErrorEvent = {
  error?: unknown;
};

function readErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as ErrorMessageLike).message;
    return typeof message === "string" ? message : String(message || "");
  }
  return String(error || "");
}

export function shouldAttemptMapLibreTiles({
  userAgent = "",
  webGlAvailable = true,
} = {}) {
  if (!webGlAvailable) return false;
  if (/HeadlessChrome/i.test(String(userAgent || ""))) return false;
  return true;
}

export function shouldLogMapTileLayerFailure(error: unknown) {
  const message = readErrorMessage(error);
  return !RECOVERABLE_FAILURE_PATTERNS.some((pattern) => pattern.test(message));
}

export function shouldSuppressMapLibreTileError(event: unknown = {}) {
  const eventError =
    event && typeof event === "object" && "error" in event
      ? (event as MapLibreTileErrorEvent).error
      : undefined;
  const message = readErrorMessage(eventError || event);
  return RECOVERABLE_TILE_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}
