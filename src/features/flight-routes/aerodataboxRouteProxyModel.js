export const AERODATABOX_RAPIDAPI_BASE =
  "https://aerodatabox.p.rapidapi.com";

export const AERODATABOX_RAPIDAPI_HOST = "aerodatabox.p.rapidapi.com";

export const AERODATABOX_MIN_REQUEST_INTERVAL_MS = 1100;

const cleanString = (value) => String(value || "").trim();

const cleanUpper = (value) => cleanString(value).toUpperCase();

const numberOrNull = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const inRange = (value, { min, max }) =>
  Number.isFinite(value) && value >= min && value <= max;

const sanitizeCode = (value, { min = 2, max = 4 } = {}) => {
  const code = cleanUpper(value);
  return new RegExp(`^[A-Z0-9]{${min},${max}}$`).test(code) ? code : "";
};

function normalizeAirport(airport) {
  const location = airport?.location || {};
  const lat = numberOrNull(location.lat ?? location.latitude ?? airport?.lat);
  const lon = numberOrNull(location.lon ?? location.longitude ?? airport?.lon);
  const icao = sanitizeCode(airport?.icao, { min: 3, max: 4 });
  const iata = sanitizeCode(airport?.iata, { min: 3, max: 3 });

  if (
    !icao ||
    !inRange(lat, { min: -90, max: 90 }) ||
    !inRange(lon, { min: -180, max: 180 })
  ) {
    return null;
  }

  return {
    icao,
    iata,
    name: cleanString(airport?.name || airport?.shortName),
    municipality: cleanString(
      airport?.municipalityName || airport?.municipality,
    ),
    country: cleanUpper(airport?.countryCode || airport?.country),
    lat,
    lon,
  };
}

export function resolveAerodataboxDateLocal(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function buildAerodataboxFlightUrl(callsign, dateLocal) {
  const normalizedCallsign = cleanUpper(callsign).replace(/\s+/g, "");
  const url = new URL(
    `/flights/CallSign/${encodeURIComponent(normalizedCallsign)}/${encodeURIComponent(dateLocal)}`,
    AERODATABOX_RAPIDAPI_BASE,
  );
  url.searchParams.set("dateLocalRole", "Both");
  url.searchParams.set("withAircraftImage", "false");
  url.searchParams.set("withLocation", "false");
  url.searchParams.set("withFlightPlan", "false");
  return url.toString();
}

export function reserveAerodataboxRequestSlot({
  now = Date.now(),
  nextAllowedAt = 0,
  minIntervalMs = AERODATABOX_MIN_REQUEST_INTERVAL_MS,
} = {}) {
  const startAt = Math.max(now, nextAllowedAt);
  return {
    delayMs: Math.max(0, startAt - now),
    nextAllowedAt: startAt + minIntervalMs,
  };
}

export function shouldSuppressVrsRouteAfterAerodataboxStatus(status) {
  return Number(status) === 429;
}

function airportMatchesTarget(airport, targetAirport = {}) {
  const targetIcao = sanitizeCode(targetAirport.icao, { min: 3, max: 4 });
  const targetIata = sanitizeCode(targetAirport.iata, { min: 3, max: 3 });
  if (!targetIcao && !targetIata) return true;
  return (
    (targetIcao && airport?.icao === targetIcao) ||
    (targetIata && airport?.iata === targetIata)
  );
}

function flightMatchesCallsign(flight, callsign) {
  const normalizedCallsign = cleanUpper(callsign).replace(/\s+/g, "");
  const flightCallsign = cleanUpper(flight?.callSign).replace(/\s+/g, "");
  return !flightCallsign || flightCallsign === normalizedCallsign;
}

function cleanFlightNumber(number, airline = {}) {
  let normalized = cleanUpper(number).replace(/\s+/g, "");
  const airlineCodes = [
    sanitizeCode(airline.iata, { min: 2, max: 2 }),
    sanitizeCode(airline.icao, { min: 2, max: 3 }),
  ].filter(Boolean);
  for (const code of airlineCodes) {
    if (normalized.startsWith(code)) {
      normalized = normalized.slice(code.length);
      break;
    }
  }
  return normalized || cleanString(number);
}

function flightStatusRank(status) {
  switch (cleanUpper(status)) {
    case "EXPECTED":
    case "DELAYED":
    case "CHECKIN":
    case "BOARDING":
    case "DEPARTED":
    case "ENROUTE":
    case "APPROACHING":
    case "LANDED":
      return 2;
    case "ARRIVED":
    case "CANCELED":
    case "CANCELLED":
      return 0;
    default:
      return 1;
  }
}

function scoreFlightCandidate({ flight, origin, destination, targetAirport }) {
  let score = flightStatusRank(flight?.status);
  if (airportMatchesTarget(destination, targetAirport)) score += 4;
  if (airportMatchesTarget(origin, targetAirport)) score += 2;
  return score;
}

export function buildAerodataboxFlightRouteResponse(
  callsign,
  payload,
  targetAirport = {},
) {
  const flights = Array.isArray(payload) ? payload : payload ? [payload] : [];
  const normalizedCallsign = cleanUpper(callsign).replace(/\s+/g, "");
  if (!normalizedCallsign) return null;

  let best = null;

  for (const flight of flights) {
    if (!flightMatchesCallsign(flight, normalizedCallsign)) continue;

    const origin = normalizeAirport(flight?.departure?.airport);
    const destination = normalizeAirport(flight?.arrival?.airport);
    if (!origin || !destination) continue;
    if (
      !airportMatchesTarget(origin, targetAirport) &&
      !airportMatchesTarget(destination, targetAirport)
    ) {
      continue;
    }

    const score = scoreFlightCandidate({ flight, origin, destination, targetAirport });
    if (!best || score > best.score) {
      best = { flight, origin, destination, score };
    }
  }

  if (!best) return null;

  const { flight, origin, destination } = best;

  return {
    callsign:
      cleanUpper(flight?.callSign).replace(/\s+/g, "") || normalizedCallsign,
    number: cleanFlightNumber(flight?.number, flight?.airline),
    airline: {
      icao: sanitizeCode(flight?.airline?.icao, { min: 2, max: 3 }),
      iata: sanitizeCode(flight?.airline?.iata, { min: 2, max: 2 }),
      name: cleanString(flight?.airline?.name),
      callsign: "",
      iconUrl: "",
    },
    origin,
    destination,
    route: {
      icao: `${origin.icao}-${destination.icao}`,
      iata:
        origin.iata && destination.iata
          ? `${origin.iata}-${destination.iata}`
          : "",
    },
    airports: [origin, destination],
    source: "aerodatabox",
    confidence: "flight-status",
  };
}
