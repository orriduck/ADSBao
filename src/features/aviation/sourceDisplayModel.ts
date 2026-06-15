const DATA_SOURCE = Object.freeze({
  ADSB_LOL: "adsb.lol",
  AIRPLANES_LIVE: "airplanes.live",
  ADSB_FI: "adsb.fi",
  ADSBDB: "adsbdb",
  FLIGHTAWARE: "flightaware",
  COMMUNITY_FEEDBACK: "community-feedback",
});

export const ROUTE_PROVIDER = Object.freeze({
  ADSBDB: DATA_SOURCE.ADSBDB,
  FLIGHTAWARE: DATA_SOURCE.FLIGHTAWARE,
});

const DATA_SOURCE_LABELS = Object.freeze({
  [DATA_SOURCE.ADSB_LOL]: "adsb.lol",
  [DATA_SOURCE.AIRPLANES_LIVE]: "airplanes.live",
  [DATA_SOURCE.ADSB_FI]: "adsb.fi",
  [DATA_SOURCE.ADSBDB]: "adsbdb",
  [DATA_SOURCE.FLIGHTAWARE]: "flightaware",
  [DATA_SOURCE.COMMUNITY_FEEDBACK]: "Community",
});

const AIRCRAFT_LOCATION_PROVIDER_LABELS = Object.freeze({
  adsb: "ads-b",
  adsb_lol: "ads-b",
  [DATA_SOURCE.ADSB_LOL]: "ads-b",
  airplanes_live: "ads-b",
  [DATA_SOURCE.AIRPLANES_LIVE]: "ads-b",
  adsb_fi: "ads-b",
  [DATA_SOURCE.ADSB_FI]: "ads-b",
  flightaware: "flightaware",
});

const AIRCRAFT_POSITION_SOURCE_LABELS = Object.freeze({
  ...AIRCRAFT_LOCATION_PROVIDER_LABELS,
  adsc: "ADS-C",
  mlat: "MLAT",
  estimated: "Estimated",
  local_projection: "Local projection",
  unknown: "",
});

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase();
}

function getDataSourceDisplayName(source) {
  const raw = String(source || "").trim();
  if (!raw) return "";
  return DATA_SOURCE_LABELS[normalizeKey(raw)] || raw;
}

function getAircraftLocationProviderDisplayName(source) {
  const raw = String(source || "").trim();
  if (!raw) return "";
  return AIRCRAFT_LOCATION_PROVIDER_LABELS[normalizeKey(raw)] || raw;
}

export function resolveRouteProvider({ flightAwareEnabled = false } = {}) {
  return flightAwareEnabled ? ROUTE_PROVIDER.FLIGHTAWARE : ROUTE_PROVIDER.ADSBDB;
}

export function resolveFlightPositionSource(quality: Record<string, any> = {}) {
  const explicit = normalizeKey(quality?.flight_position_source);
  if (["adsb", "adsc", "mlat", "estimated", "flightaware"].includes(explicit)) {
    return explicit;
  }
  const source = normalizeKey(quality?.source);
  const kind = normalizeKey(quality?.kind);
  if (source === "flightaware") return "flightaware";
  if (source === "mlat" || kind === "mlat") return "mlat";
  if (
    quality?.isEstimated === true ||
    source === "local_projection" ||
    ["estimated", "predicted", "interpolated"].includes(kind)
  ) {
    return "estimated";
  }
  if (
    source === "adsb_lol" ||
    source === DATA_SOURCE.ADSB_LOL ||
    source === "airplanes_live" ||
    source === DATA_SOURCE.AIRPLANES_LIVE ||
    source === "adsb_fi" ||
    source === DATA_SOURCE.ADSB_FI
  ) {
    return "adsb";
  }
  return source ? source : "";
}

export function getAircraftPositionSourceBadge(quality: Record<string, any> = {}) {
  const explicitSource = normalizeKey(quality?.flight_position_source);
  const source = explicitSource
    ? resolveFlightPositionSource(quality)
    : normalizeKey(quality?.source) || resolveFlightPositionSource(quality);
  const kind = normalizeKey(quality?.kind);
  const sourceLabel = AIRCRAFT_POSITION_SOURCE_LABELS[source] || "";
  if (source === "adsc" && kind === "oceanic") return "ADS-C · oceanic";
  if (!sourceLabel) return kind === "stale" ? "Stale" : "";
  if (source === "flightaware") return sourceLabel;
  if (kind === "stale") return "Stale";
  return sourceLabel;
}

export function buildMapSourceStatusDisplay({
  feedSource = "",
}: Record<string, any> = {}) {
  return {
    feedSource: getAircraftLocationProviderDisplayName(feedSource),
  };
}
