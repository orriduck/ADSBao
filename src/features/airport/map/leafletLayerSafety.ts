export function safeAddToMap(
  layer,
  map,
  { label = "LeafletLayer", logger = console } = {},
) {
  if (!layer || !map) return null;
  try {
    return layer.addTo(map);
  } catch (error) {
    logger.warn?.(`[${label}] addTo skipped (map not ready)`, error.message);
    return null;
  }
}

export function safeRemoveFromMap(layer, map) {
  if (!layer || !map) return;
  try {
    layer.removeFrom(map);
  } catch {
    /* layer or pane already torn down; nothing to clean up */
  }
}
