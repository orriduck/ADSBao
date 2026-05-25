export const ADSB_FRESH_MAX_AGE_SECONDS = 60;
export const ADSB_STALE_MIN_AGE_SECONDS = 90;

const PROVIDER_SOURCE = Object.freeze({
  "adsb.lol": "adsb_lol",
  "airplanes.live": "airplanes_live",
  flightaware: "flightaware",
});

const toNumber = (value) => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const isoFromNow = (now) => new Date(now || Date.now()).toISOString();

export function getAdsbPositionAgeSeconds(position, now = Date.now()) {
  const directAge = toNumber(position?.seen_pos ?? position?.seen);
  if (directAge != null) return Math.max(0, directAge);

  const positionTime = toNumber(position?.positionTime);
  if (positionTime != null) return Math.max(0, (now - positionTime) / 1000);

  return Number.POSITIVE_INFINITY;
}

export function hasUsableLatLon(position) {
  const lat = toNumber(position?.lat);
  const lon = toNumber(position?.lon);
  return lat != null && lon != null && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

function sourceKey(source) {
  return PROVIDER_SOURCE[String(source || "").trim().toLowerCase()] || "unknown";
}

export function buildPositionQuality({
  source,
  kind = "observed",
  fetchedAt,
  sourceUpdatedAt,
  ageSeconds,
  sourceLabel,
  notes,
  confidence,
} = {}) {
  const normalizedKind = String(kind || "observed").toLowerCase();
  return {
    source: sourceKey(source),
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

export function annotateAdsbPosition(position, { source, now = Date.now() } = {}) {
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

function pickFreshPrimary(candidates, now) {
  return candidates
    .filter((candidate) => candidate?.position && hasUsableLatLon(candidate.position))
    .map((candidate) => ({
      ...candidate,
      ageSeconds: getAdsbPositionAgeSeconds(candidate.position, now),
    }))
    .filter((candidate) => candidate.ageSeconds <= ADSB_FRESH_MAX_AGE_SECONDS)
    .sort((a, b) => a.ageSeconds - b.ageSeconds)[0] || null;
}

function pickStalePrimary(candidates, now) {
  return candidates
    .filter((candidate) => candidate?.position && hasUsableLatLon(candidate.position))
    .map((candidate) => ({
      ...candidate,
      ageSeconds: getAdsbPositionAgeSeconds(candidate.position, now),
    }))
    .sort((a, b) => a.ageSeconds - b.ageSeconds)[0] || null;
}

function normalizeFlightAwarePosition(position) {
  if (!position || !hasUsableLatLon(position)) return null;
  return {
    hex: position.hex || "",
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
    origin: position.origin || "",
    destination: position.destination || "",
    route: position.route || "",
    positionQuality: position.quality,
  };
}

export async function resolveTrackedFlightPosition({
  adsbLolPosition = null,
  airplanesLivePosition = null,
  flightAwareFallback = null,
  getFlightAwareFallback = null,
  localProjection = null,
  lastKnown = null,
  callsign = "",
  featureEnabled = false,
  now = Date.now(),
} = {}) {
  const candidates = [
    { source: "adsb.lol", position: adsbLolPosition },
    { source: "airplanes.live", position: airplanesLivePosition },
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
    };
  }

  let fallback = flightAwareFallback;
  if (!fallback && featureEnabled && typeof getFlightAwareFallback === "function") {
    fallback = await getFlightAwareFallback(callsign);
  }

  if (fallback?.ok && fallback.hasPosition) {
    const position = normalizeFlightAwarePosition(fallback.position);
    if (position) {
      return { source: "flightaware", position, fallback };
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
    };
  }

  const stale = pickStalePrimary(candidates, now);
  const fallbackPosition = stale?.position || lastKnown;
  if (fallbackPosition && hasUsableLatLon(fallbackPosition)) {
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
    };
  }

  return { source: "", position: null, fallback };
}
