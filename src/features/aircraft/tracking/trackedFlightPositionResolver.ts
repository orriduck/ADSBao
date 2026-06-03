import {
  hasActiveFlightAwareFallback,
  hasTerminalFlightAwareFallback,
} from "./lostSignalTrackingModel";

const ADSB_FRESH_MAX_AGE_SECONDS = 60;
const ADSB_STALE_MIN_AGE_SECONDS = 90;

const TRACKED_FLIGHT_STATUS = Object.freeze({
  ADSB_LIVE: "adsb_live",
  FLIGHTAWARE_ACTIVE: "flightaware_active",
  FLIGHTAWARE_TERMINAL: "flightaware_terminal",
  STALE: "stale",
  MISSING: "missing",
});

const PROVIDER_SOURCE = Object.freeze({
  "adsb.lol": "adsb_lol",
  "airplanes.live": "airplanes_live",
  "adsb.fi": "adsb_fi",
  flightaware: "flightaware",
});

type TrackingRecord = Record<string, any>;

const toNumber = (value: unknown) => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const isoFromNow = (now = Date.now()) => new Date(now || Date.now()).toISOString();

function buildTrackingState(status: string, overrides: TrackingRecord = {}) {
  return {
    status,
    active:
      status === TRACKED_FLIGHT_STATUS.ADSB_LIVE ||
      status === TRACKED_FLIGHT_STATUS.FLIGHTAWARE_ACTIVE,
    terminal: status === TRACKED_FLIGHT_STATUS.FLIGHTAWARE_TERMINAL,
    ...overrides,
  };
}

function getAdsbPositionAgeSeconds(position: TrackingRecord, now = Date.now()) {
  const directAge = toNumber(position?.seen_pos ?? position?.seen);
  if (directAge != null) return Math.max(0, directAge);

  const positionTime = toNumber(position?.positionTime);
  if (positionTime != null) return Math.max(0, (now - positionTime) / 1000);

  return Number.POSITIVE_INFINITY;
}

function hasUsableLatLon(position: TrackingRecord | null | undefined) {
  const lat = toNumber(position?.lat);
  const lon = toNumber(position?.lon);
  return lat != null && lon != null && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

function sourceKey(source: unknown) {
  return PROVIDER_SOURCE[String(source || "").trim().toLowerCase()] || "unknown";
}

function buildPositionQuality({
  source,
  kind = "observed",
  fetchedAt,
  sourceUpdatedAt,
  ageSeconds,
  sourceLabel,
  notes,
  confidence,
}: TrackingRecord = {}) {
  const normalizedKind = String(kind || "observed").toLowerCase();
  const normalizedSource = sourceKey(source);
  const flightPositionSource =
    normalizedSource === "flightaware"
      ? "flightaware"
      : normalizedKind === "stale"
        ? "estimated"
        : normalizedKind === "observed"
          ? "adsb"
          : "estimated";
  return {
    source: normalizedSource,
    flight_position_source: flightPositionSource,
    kind: normalizedKind,
    isEstimated: normalizedKind !== "observed",
    isPredicted: normalizedKind === "predicted",
    isInterpolated: normalizedKind === "interpolated",
    isStale: normalizedKind === "stale",
    sourceLabel,
    sourceUpdatedAt,
    fetchedAt: fetchedAt || isoFromNow(),
    ageSeconds,
    confidence: confidence || (normalizedKind === "observed" ? "high" : "unknown"),
    notes: Array.isArray(notes) ? notes.filter(Boolean) : undefined,
  };
}

export function annotateAdsbPosition(
  position: TrackingRecord | null | undefined,
  { source, now = Date.now() }: TrackingRecord = {},
) {
  if (!position || typeof position !== "object") return null;
  const ageSeconds = getAdsbPositionAgeSeconds(position, now);
  const isStale = ageSeconds > ADSB_STALE_MIN_AGE_SECONDS;
  return {
    ...position,
    source,
    positionQuality: buildPositionQuality({
      source,
      kind: isStale ? "stale" : "observed",
      fetchedAt: isoFromNow(now),
      ageSeconds: Number.isFinite(ageSeconds) ? Math.round(ageSeconds) : undefined,
      sourceLabel: source,
      confidence: isStale ? "low" : "high",
    }),
  };
}

function pickFreshPrimary(candidates: TrackingRecord[], now: number): TrackingRecord | null {
  return candidates
    .filter((candidate) => candidate?.position && hasUsableLatLon(candidate.position))
    .map((candidate) => ({
      ...candidate,
      ageSeconds: getAdsbPositionAgeSeconds(candidate.position, now),
    }))
    .filter((candidate) => candidate.ageSeconds <= ADSB_FRESH_MAX_AGE_SECONDS)
    .sort((a, b) => a.ageSeconds - b.ageSeconds)[0] || null;
}

function pickStalePrimary(candidates: TrackingRecord[], now: number): TrackingRecord | null {
  return candidates
    .filter((candidate) => candidate?.position && hasUsableLatLon(candidate.position))
    .map((candidate) => ({
      ...candidate,
      ageSeconds: getAdsbPositionAgeSeconds(candidate.position, now),
    }))
    .sort((a, b) => a.ageSeconds - b.ageSeconds)[0] || null;
}

function normalizeFlightAwarePosition(
  position: TrackingRecord | null | undefined,
  { fallbackHex = "" }: TrackingRecord = {},
) {
  if (!position || !hasUsableLatLon(position)) return null;
  return {
    hex: position.hex || fallbackHex || "",
    flight: position.callsign || "",
    callsign: position.callsign || "",
    lat: position.lat,
    lon: position.lon,
    alt_baro: position.altitudeFt ?? null,
    gs: position.groundSpeedKt ?? null,
    track: position.trackDeg ?? position.headingDeg ?? 0,
    seen: position.quality?.ageSeconds ?? 0,
    seen_pos: position.quality?.ageSeconds ?? 0,
    flightAwareUrl: position.flightAwareUrl || "",
    flight_position_source:
      position.flight_position_source ||
      position.quality?.flight_position_source ||
      "flightaware",
    origin: position.origin || "",
    destination: position.destination || "",
    route: position.route || "",
    positionQuality: position.quality,
  };
}

export async function resolveTrackedFlightPosition({
  adsbLolPosition = null,
  airplanesLivePosition = null,
  adsbFiPosition = null,
  flightAwareFallback = null,
  getFlightAwareFallback = null,
  localProjection = null,
  lastKnown = null,
  callsign = "",
  featureEnabled = false,
  now = Date.now(),
}: TrackingRecord = {}) {
  const candidates = [
    { source: "adsb.lol", position: adsbLolPosition },
    { source: "airplanes.live", position: airplanesLivePosition },
    { source: "adsb.fi", position: adsbFiPosition },
  ];

  const fresh = pickFreshPrimary(candidates, now);
  if (fresh) {
    return {
      source: fresh.source,
      position: annotateAdsbPosition(fresh.position, {
        source: fresh.source,
        now,
      }),
      fallback: null,
      trackingState: buildTrackingState(TRACKED_FLIGHT_STATUS.ADSB_LIVE, {
        source: fresh.source,
      }),
    };
  }

  const stale = pickStalePrimary(candidates, now);
  let fallback = flightAwareFallback;
  if (!fallback && featureEnabled && typeof getFlightAwareFallback === "function") {
    fallback = await getFlightAwareFallback(callsign);
  }
  const fallbackTerminal = hasTerminalFlightAwareFallback(fallback);
  const fallbackActive = hasActiveFlightAwareFallback(fallback);
  const fallbackTrackingState = fallbackTerminal
    ? buildTrackingState(TRACKED_FLIGHT_STATUS.FLIGHTAWARE_TERMINAL, {
        source: "flightaware",
      })
    : fallbackActive
      ? buildTrackingState(TRACKED_FLIGHT_STATUS.FLIGHTAWARE_ACTIVE, {
          source: "flightaware",
        })
      : null;

  if (!fallbackTerminal && fallback?.ok && fallback.hasPosition) {
    const position = normalizeFlightAwarePosition(fallback.position, {
      fallbackHex: stale?.position?.hex || lastKnown?.hex || "",
    });
    if (position) {
      return {
        source: "flightaware",
        position,
        fallback,
        trackingState: fallbackTrackingState ||
          buildTrackingState(TRACKED_FLIGHT_STATUS.FLIGHTAWARE_ACTIVE, {
            source: "flightaware",
          }),
      };
    }
  }

  if (localProjection && hasUsableLatLon(localProjection)) {
    return {
      source: "local_projection",
      position: {
        ...localProjection,
        positionQuality:
          localProjection.positionQuality ||
          buildPositionQuality({
            source: "local_projection",
            kind: "interpolated",
            fetchedAt: isoFromNow(now),
            confidence: "low",
          }),
      },
      fallback,
      trackingState: fallbackTrackingState ||
        buildTrackingState(TRACKED_FLIGHT_STATUS.STALE, {
          source: "local_projection",
        }),
    };
  }

  const fallbackPosition = stale?.position || lastKnown;
  if (fallbackPosition && hasUsableLatLon(fallbackPosition)) {
    const staleStatus = stale
      ? TRACKED_FLIGHT_STATUS.STALE
      : TRACKED_FLIGHT_STATUS.MISSING;
    return {
      source: stale?.source || "last_known",
      position: {
        ...fallbackPosition,
        positionQuality: buildPositionQuality({
          source: stale?.source || fallbackPosition.source || "unknown",
          kind: "stale",
          fetchedAt: isoFromNow(now),
          ageSeconds: Math.round(getAdsbPositionAgeSeconds(fallbackPosition, now)),
          confidence: "low",
        }),
      },
      fallback,
      trackingState: fallbackTrackingState ||
        buildTrackingState(staleStatus, {
          source: stale?.source || fallbackPosition.source || "unknown",
        }),
    };
  }

  return {
    source: "",
    position: null,
    fallback,
    trackingState: fallbackTrackingState ||
      buildTrackingState(TRACKED_FLIGHT_STATUS.MISSING),
  };
}
