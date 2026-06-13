import {
  COMMUNITY_FEEDBACK_REASONS,
  buildCommunityFeedbackRoute,
  computeFeedbackExpiry,
} from "../../../features/aviation/flight-routes/communityFeedbackRouteModel";
import {
  normalizeRouteCallsign,
  sanitizeAirportCode,
} from "../../../features/aviation/flight-routes/flightRouteCallsign";
import { buildRouteCacheKey } from "../../../features/aviation/flight-routes/flightRouteLookupModel";

const FEEDBACK_REASON_VALUES = new Set(Object.values(COMMUNITY_FEEDBACK_REASONS));

type RouteFeedbackHandlerRecord = Record<string, any>;

const sanitizeAircraftHex = (value: unknown) => {
  const hex = String(value || "").trim().toLowerCase();
  return /^~?[0-9a-f]{6}$/.test(hex) ? hex : "";
};

const sanitizeAircraftType = (value: unknown) => {
  const type = String(value || "").trim().toUpperCase();
  return /^[A-Z0-9]{2,8}$/.test(type) ? type : "";
};

const sanitizePriorRoute = (raw: RouteFeedbackHandlerRecord | null | undefined) => {
  if (!raw || typeof raw !== "object") return null;
  const originIcao = sanitizeAirportCode(
    raw.origin?.icao ?? raw.originIcao,
  );
  const destinationIcao = sanitizeAirportCode(
    raw.destination?.icao ?? raw.destinationIcao,
  );
  const source = String(raw.source || "").trim();
  if (!originIcao && !destinationIcao && !source) return null;
  return {
    origin: originIcao ? { icao: originIcao } : null,
    destination: destinationIcao ? { icao: destinationIcao } : null,
    source: source || "",
  };
};

// Pure validation of a `/api/route-feedback` POST body. Returns a normalized
// shape on success or a structured error on failure so the handler can map
// it to a 400 response without doing the validation itself.
export function normalizeRouteFeedbackInput(rawBody: RouteFeedbackHandlerRecord | null | undefined) {
  if (!rawBody || typeof rawBody !== "object") {
    return { ok: false, error: "Invalid request body" };
  }

  const normalizedCallsign = normalizeRouteCallsign(rawBody.callsign);
  if (!normalizedCallsign) {
    return { ok: false, error: "Invalid callsign" };
  }

  const originIcao = sanitizeAirportCode(rawBody.originIcao);
  const destinationIcao = sanitizeAirportCode(rawBody.destinationIcao);
  if (!originIcao || !destinationIcao) {
    return { ok: false, error: "Invalid origin or destination ICAO" };
  }
  if (originIcao === destinationIcao) {
    return {
      ok: false,
      error: "Origin and destination must differ",
    };
  }

  const targetAirportIcao = sanitizeAirportCode(rawBody.targetAirportIcao);
  const targetAirportIata = sanitizeAirportCode(rawBody.targetAirportIata, {
    min: 3,
    max: 3,
  });

  const requestedReason = String(rawBody.feedbackReason || "").trim() as "correction" | "missing_route";
  const feedbackReason = FEEDBACK_REASON_VALUES.has(requestedReason)
    ? requestedReason
    : COMMUNITY_FEEDBACK_REASONS.missingRoute;

  return {
    ok: true,
    value: {
      normalizedCallsign,
      originIcao,
      destinationIcao,
      targetAirportIcao,
      targetAirportIata,
      feedbackReason,
      aircraftHex: sanitizeAircraftHex(rawBody.aircraftHex),
      aircraftType: sanitizeAircraftType(rawBody.aircraftType),
      priorRoute: sanitizePriorRoute(rawBody.priorRoute),
    },
  };
}

// Builds the canonical insert spec for the Postgres write and the route
// payload the handler echoes back to the client for acknowledgement.
export function buildRouteFeedbackInsertSpec({
  input,
  originAirport,
  destinationAirport,
  now = Date.now(),
}: RouteFeedbackHandlerRecord = {}) {
  if (!input || !originAirport || !destinationAirport) return null;
  const { createdAt, expiresAt } = computeFeedbackExpiry(now);
  const route = buildCommunityFeedbackRoute({
    callsign: input.normalizedCallsign,
    origin: originAirport,
    destination: destinationAirport,
    createdAt,
    expiresAt,
    feedbackReason: input.feedbackReason,
  });
  if (!route) return null;

  const cacheKey = buildRouteCacheKey(input.normalizedCallsign, {
    icao: input.targetAirportIcao,
    iata: input.targetAirportIata,
  });

  return {
    route,
    cacheKey,
    record: {
      cacheKey,
      normalizedCallsign: input.normalizedCallsign,
      targetAirportIcao: input.targetAirportIcao,
      targetAirportIata: input.targetAirportIata,
      originIcao: input.originIcao,
      destinationIcao: input.destinationIcao,
      aircraftHex: input.aircraftHex,
      aircraftType: input.aircraftType,
      feedbackReason: input.feedbackReason,
      priorRoutePayload: input.priorRoute,
      routePayload: route,
      createdAt,
      expiresAt,
    },
  };
}
