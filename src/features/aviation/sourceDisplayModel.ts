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
  [DATA_SOURCE.FLIGHTAWARE]: "FlightAware",
  [DATA_SOURCE.COMMUNITY_FEEDBACK]: "Community",
});

const AIRCRAFT_POSITION_SOURCE_LABELS = Object.freeze({
  adsb: "ADS-B",
  mlat: "MLAT",
  estimated: "Estimated",
  adsb_lol: "ADS-B",
  [DATA_SOURCE.ADSB_LOL]: "ADS-B",
  airplanes_live: "Airplanes.live",
  [DATA_SOURCE.AIRPLANES_LIVE]: "Airplanes.live",
  adsb_fi: "adsb.fi",
  [DATA_SOURCE.ADSB_FI]: "adsb.fi",
  flightaware: "FlightAware",
  local_projection: "Local projection",
  unknown: "",
});

const ROUTE_PROVIDER_LABELS = Object.freeze({
  [ROUTE_PROVIDER.ADSBDB]: DATA_SOURCE_LABELS[DATA_SOURCE.ADSBDB],
  [ROUTE_PROVIDER.FLIGHTAWARE]: DATA_SOURCE_LABELS[DATA_SOURCE.FLIGHTAWARE],
});

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase();
}

function getDataSourceDisplayName(source) {
  const raw = String(source || "").trim();
  if (!raw) return "";
  return DATA_SOURCE_LABELS[normalizeKey(raw)] || raw;
}

function getRouteProviderDisplayName(provider) {
  const raw = String(provider || "").trim();
  if (!raw) return "";
  return ROUTE_PROVIDER_LABELS[normalizeKey(raw)] || raw;
}

export function resolveRouteProvider({ flightAwareEnabled = false } = {}) {
  return flightAwareEnabled ? ROUTE_PROVIDER.FLIGHTAWARE : ROUTE_PROVIDER.ADSBDB;
}

export function resolveFlightPositionSource(quality: Record<string, any> = {}) {
  const explicit = normalizeKey(quality?.flight_position_source);
  if (["adsb", "mlat", "estimated", "flightaware"].includes(explicit)) {
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
  if (!sourceLabel) return kind === "stale" ? "Stale" : "";
  if (kind === "stale") return sourceLabel === "FlightAware" ? "FlightAware · stale" : "Stale";
  if (
    source === "flightaware" &&
    (quality?.isEstimated === true ||
      kind === "estimated" ||
      kind === "predicted" ||
      kind === "interpolated")
  ) {
    return `${sourceLabel} · ${kind || "estimated"}`;
  }
  return sourceLabel;
}

function badgeText(value) {
  return String(value || "").trim().toUpperCase();
}

export function buildMapSourceStatusDisplay({
  feedSource = "",
  routeProvider = "",
} = {}) {
  return {
    feedSource: badgeText(getDataSourceDisplayName(feedSource)),
    routeProvider: badgeText(getRouteProviderDisplayName(routeProvider)),
  };
}
