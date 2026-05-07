export function ensureAirportMapPane(map, paneConfig) {
  if (!map || !paneConfig?.name) return undefined;

  let pane = map.getPane(paneConfig.name);
  if (!pane) {
    pane = map.createPane(paneConfig.name);
  }
  if (Number.isFinite(paneConfig.zIndex)) {
    pane.style.zIndex = String(paneConfig.zIndex);
  }
  pane.style.pointerEvents = "none";

  return paneConfig.name;
}
