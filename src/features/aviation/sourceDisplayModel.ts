function normalizeKey(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export function resolveFlightPositionSource(quality: Record<string, any> = {}) {
  const kind = normalizeKey(quality?.kind);
  const explicit = normalizeKey(quality?.flight_position_source);
  if (explicit === "adsc") return "adsc";
  if (explicit === "mlat" || kind === "mlat") return "mlat";
  if (
    quality?.isEstimated === true ||
    explicit === "estimated" ||
    ["estimated", "predicted", "interpolated", "stale"].includes(kind)
  ) {
    return "estimated";
  }
  return quality?.source || explicit ? "adsb" : "";
}

export function getAircraftPositionSourceBadge(quality: Record<string, any> = {}) {
  const source = resolveFlightPositionSource(quality);
  const kind = normalizeKey(quality?.kind);
  if (source === "adsc" && kind === "oceanic") return "ADS-C · oceanic";
  if (source === "mlat") return "MLAT";
  if (kind === "stale") return "Stale";
  if (source === "estimated") return "Estimated";
  return source === "adsb" ? "ads-b" : "";
}

export function buildMapSourceStatusDisplay({ feedSource = "" }: Record<string, any> = {}) {
  return { feedSource: feedSource ? "Live feed" : "" };
}
