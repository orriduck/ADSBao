export const DATA_SOURCE = Object.freeze({
  ADSB_LOL: "adsb.lol",
  AIRPLANES_LIVE: "airplanes.live",
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
  [DATA_SOURCE.ADSBDB]: "adsbdb",
  [DATA_SOURCE.FLIGHTAWARE]: "FlightAware",
  [DATA_SOURCE.COMMUNITY_FEEDBACK]: "Community",
});

const AIRCRAFT_POSITION_SOURCE_LABELS = Object.freeze({
  adsb_lol: "ADS-B",
  [DATA_SOURCE.ADSB_LOL]: "ADS-B",
  airplanes_live: "Airplanes.live",
  [DATA_SOURCE.AIRPLANES_LIVE]: "Airplanes.live",
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

export function getDataSourceDisplayName(source) {
  const raw = String(source || "").trim();
  if (!raw) return "";
  return DATA_SOURCE_LABELS[normalizeKey(raw)] || raw;
}

export function getRouteProviderDisplayName(provider) {
  const raw = String(provider || "").trim();
  if (!raw) return "";
  return ROUTE_PROVIDER_LABELS[normalizeKey(raw)] || raw;
}

export function resolveRouteProvider({ flightAwareEnabled = false } = {}) {
  return flightAwareEnabled ? ROUTE_PROVIDER.FLIGHTAWARE : ROUTE_PROVIDER.ADSBDB;
}

export function getAircraftPositionSourceBadge(quality) {
  const source = normalizeKey(quality?.source);
  const kind = normalizeKey(quality?.kind);
  const sourceLabel = AIRCRAFT_POSITION_SOURCE_LABELS[source] || "";
  if (!sourceLabel) return kind === "stale" ? "Stale" : "";
  if (kind === "stale") return sourceLabel === "FlightAware" ? "FlightAware · stale" : "Stale";
  if (
    source === "flightaware" &&
    (kind === "estimated" || kind === "predicted" || kind === "interpolated")
  ) {
    return `${sourceLabel} · ${kind}`;
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
