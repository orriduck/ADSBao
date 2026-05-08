export const FLIGHTAWARE_BASE = "https://www.flightaware.com/live/flight";

export const FLIGHTAWARE_USER_AGENT =
  "ADSBao/0.9.0 (+https://github.com/orriduck/ADSBao) FlightAware-scraper/1.0";

const TARGETING_RE = /\.setTargeting\('(\w+)',\s*'([^']*)'\)/g;
const TARGETING_KEYS = new Set([
  "origin",
  "origin_IATA",
  "destination",
  "destination_IATA",
]);

const cleanString = (value) => String(value || "").trim();

const numberOrNull = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export function normalizeRouteCallsign(rawCallsign) {
  const callsign = String(rawCallsign || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  if (!callsign || callsign.length < 3 || !/^[A-Z][A-Z0-9]{2,7}$/.test(callsign)) {
    return "";
  }
  return callsign;
}

export function buildFlightAwareUrl(callsign) {
  return `${FLIGHTAWARE_BASE}/${encodeURIComponent(callsign)}`;
}

export function sanitizeFlightAwareAirportCode(value, { length }) {
  const code = String(value || "").trim().toUpperCase();
  return new RegExp(`^[A-Z0-9]{${length}}$`).test(code) ? code : "";
}

function sanitizeFlightAwareUrl(value) {
  const raw = cleanString(value);
  if (!raw) return "";

  try {
    const url = new URL(raw, "https://www.flightaware.com");
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function extractBalancedObject(source, startIndex) {
  if (startIndex < 0 || source[startIndex] !== "{") return "";

  let depth = 0;
  let inString = false;
  let stringQuote = "";
  let escaped = false;

  for (let i = startIndex; i < source.length; i += 1) {
    const char = source[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === stringQuote) {
        inString = false;
        stringQuote = "";
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      stringQuote = char;
      continue;
    }

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(startIndex, i + 1);
      }
    }
  }

  return "";
}

function parseTrackpollBootstrap(html) {
  const assignmentIndex = html.indexOf("var trackpollBootstrap");
  if (assignmentIndex < 0) return null;

  const objectStart = html.indexOf("{", assignmentIndex);
  const objectSource = extractBalancedObject(html, objectStart);
  if (!objectSource) return null;

  try {
    return JSON.parse(objectSource);
  } catch {
    return null;
  }
}

function normalizeFlightAwareAirport(airport) {
  const coord = Array.isArray(airport?.coord) ? airport.coord : [];
  const longitude = numberOrNull(coord[0]);
  const latitude = numberOrNull(coord[1]);

  return {
    icao: sanitizeFlightAwareAirportCode(airport?.icao, { length: 4 }),
    iata: sanitizeFlightAwareAirportCode(airport?.iata, { length: 3 }),
    name: cleanString(airport?.friendlyName || airport?.name),
    municipality: cleanString(airport?.friendlyLocation || airport?.municipality),
    latitude,
    longitude,
  };
}

function extractTrackpollRoute(html) {
  const bootstrap = parseTrackpollBootstrap(html);
  const flights = bootstrap?.flights && typeof bootstrap.flights === "object"
    ? Object.values(bootstrap.flights)
    : [];
  const flight = flights.find((item) => item?.origin || item?.destination);
  if (!flight) return null;

  const airline = flight.airline || flight.codeShare?.airline || {};
  const thumbnail = flight.thumbnail || flight.codeShare?.thumbnail || {};
  const origin = normalizeFlightAwareAirport(flight.origin);
  const destination = normalizeFlightAwareAirport(flight.destination);

  if (!origin.icao && !destination.icao) return null;

  return {
    origin,
    destination,
    airline: {
      name: cleanString(airline.shortName || airline.fullName || airline.name),
      icao: sanitizeFlightAwareAirportCode(airline.icao, { length: 3 }),
      iata: sanitizeFlightAwareAirportCode(airline.iata, { length: 2 }),
      callsign: cleanString(airline.callsign),
      iconUrl: sanitizeFlightAwareUrl(thumbnail.imageUrl),
    },
    callsignIcao: cleanString(flight.displayIdent || flight.ident).toUpperCase(),
    callsignIata: cleanString(flight.iataIdent || flight.codeShare?.iataIdent)
      .toUpperCase(),
    friendlyIdent: cleanString(flight.friendlyIdent || flight.codeShare?.friendlyIdent),
  };
}

export function extractFlightAwareTargeting(html) {
  const trackpollRoute = extractTrackpollRoute(html);
  if (trackpollRoute) return trackpollRoute;

  const targeting = {};
  let match;
  TARGETING_RE.lastIndex = 0;
  while ((match = TARGETING_RE.exec(html)) !== null) {
    if (TARGETING_KEYS.has(match[1])) {
      targeting[match[1]] = match[2];
    }
  }
  TARGETING_RE.lastIndex = 0;

  const originIcao = sanitizeFlightAwareAirportCode(targeting.origin, { length: 4 });
  const originIata = sanitizeFlightAwareAirportCode(targeting.origin_IATA, {
    length: 3,
  });
  const destinationIcao = sanitizeFlightAwareAirportCode(targeting.destination, {
    length: 4,
  });
  const destinationIata = sanitizeFlightAwareAirportCode(
    targeting.destination_IATA,
    { length: 3 },
  );

  if (!originIcao && !destinationIcao) return null;

  return {
    origin: { icao: originIcao, iata: originIata },
    destination: { icao: destinationIcao, iata: destinationIata },
  };
}

function buildAirportResponse(airport = {}) {
  const latitude = numberOrNull(airport.latitude);
  const longitude = numberOrNull(airport.longitude);

  return {
    icao_code: airport.icao || "",
    iata_code: airport.iata || "",
    name: airport.name || "",
    municipality: airport.municipality || "",
    country_name: airport.country || "",
    latitude: latitude ?? 0,
    longitude: longitude ?? 0,
  };
}

export function buildFlightAwareRouteResponse(callsign, scraped) {
  if (!scraped) return { response: null };

  const normalizedCallsign = callsign.toUpperCase();

  return {
    response: {
      flightroute: {
        callsign: normalizedCallsign,
        callsign_icao: scraped.callsignIcao || normalizedCallsign,
        callsign_iata: scraped.callsignIata || "",
        origin: buildAirportResponse(scraped.origin),
        destination: buildAirportResponse(scraped.destination),
        airline: {
          name: scraped.airline?.name || "",
          icao: scraped.airline?.icao || callsign.slice(0, 3).toUpperCase(),
          iata: scraped.airline?.iata || "",
          callsign: scraped.airline?.callsign || "",
          icon_url: scraped.airline?.iconUrl || "",
        },
      },
    },
  };
}
