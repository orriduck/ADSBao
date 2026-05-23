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

function badgeText(value) {
  return String(value || "").trim().toUpperCase();
}

export function buildMobileMapSourceStatus({
  feedSource = "",
  routeProvider = "",
} = {}) {
  return {
    feedSource: badgeText(getDataSourceDisplayName(feedSource)),
    routeProvider: badgeText(getRouteProviderDisplayName(routeProvider)),
  };
}
