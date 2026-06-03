import {
  normalizeRouteCallsign,
  sanitizeAirportCode,
} from "./flightRouteCallsign";

// Community feedback gives us a temporary override that the UI labels with
// a `*` suffix and an "expires in 12h" tooltip. Keeping the constants here
// — alongside the builder — keeps the route shape and its UI contract in
// one place so the handler, normalizer, and renderer can't drift.
const COMMUNITY_FEEDBACK_TTL_MS = 12 * 60 * 60 * 1000;
const COMMUNITY_FEEDBACK_SOURCE = "community-feedback";
const COMMUNITY_FEEDBACK_DISPLAY_SUFFIX = "*";
export const COMMUNITY_FEEDBACK_REASONS = Object.freeze({
  missingRoute: "missing_route",
  correction: "correction",
});

type FeedbackAirportInput = {
  icao?: unknown;
  iata?: unknown;
  name?: unknown;
  municipality?: unknown;
  city?: unknown;
  country?: unknown;
  lat?: unknown;
  lon?: unknown;
};

type CommunityFeedbackRouteOptions = {
  callsign?: unknown;
  origin?: FeedbackAirportInput | null;
  destination?: FeedbackAirportInput | null;
  createdAt?: string | null;
  expiresAt?: string | null;
  feedbackReason?: string;
};

function airportFields(airport: FeedbackAirportInput | null | undefined) {
  if (!airport || typeof airport !== "object") return null;
  const icao = sanitizeAirportCode(airport.icao);
  if (!icao) return null;
  return {
    icao,
    iata: sanitizeAirportCode(airport.iata, { min: 3, max: 3 }),
    name: String(airport.name || "").trim(),
    municipality: String(airport.municipality || airport.city || "").trim(),
    country: String(airport.country || "").trim().toUpperCase(),
    lat: Number.isFinite(Number(airport.lat)) ? Number(airport.lat) : null,
    lon: Number.isFinite(Number(airport.lon)) ? Number(airport.lon) : null,
  };
}

export function buildCommunityFeedbackRoute({
  callsign,
  origin,
  destination,
  createdAt,
  expiresAt,
  feedbackReason = COMMUNITY_FEEDBACK_REASONS.missingRoute,
}: CommunityFeedbackRouteOptions = {}) {
  const normalizedCallsign = normalizeRouteCallsign(callsign);
  if (!normalizedCallsign) return null;

  const originFields = airportFields(origin);
  const destinationFields = airportFields(destination);
  if (!originFields || !destinationFields) return null;
  if (originFields.icao === destinationFields.icao) return null;

  const routeIcao = `${originFields.icao}-${destinationFields.icao}`;
  const routeIata =
    originFields.iata && destinationFields.iata
      ? `${originFields.iata}-${destinationFields.iata}`
      : "";

  return {
    callsign: normalizedCallsign,
    callsignIcao: normalizedCallsign,
    callsignIata: "",
    number: "",
    airline: {
      icao: normalizedCallsign.slice(0, 3),
      iata: "",
      name: "",
      callsign: "",
      iconUrl: "",
    },
    origin: originFields,
    destination: destinationFields,
    route: { icao: routeIcao, iata: routeIata },
    airports: [originFields, destinationFields],
    source: COMMUNITY_FEEDBACK_SOURCE,
    confidence: "user-supplied",
    temporary: true,
    displaySuffix: COMMUNITY_FEEDBACK_DISPLAY_SUFFIX,
    feedbackReason,
    createdAt: createdAt || null,
    expiresAt: expiresAt || null,
  };
}

export function computeFeedbackExpiry(now = Date.now()) {
  const createdAt = new Date(now).toISOString();
  const expiresAt = new Date(now + COMMUNITY_FEEDBACK_TTL_MS).toISOString();
  return { createdAt, expiresAt };
}
