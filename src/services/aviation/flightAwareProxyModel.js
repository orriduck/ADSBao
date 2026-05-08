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

export function extractFlightAwareTargeting(html) {
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

export function buildFlightAwareRouteResponse(callsign, scraped) {
  if (!scraped) return { response: null };

  return {
    response: {
      flightroute: {
        callsign: callsign.toUpperCase(),
        origin: {
          icao_code: scraped.origin.icao,
          iata_code: scraped.origin.iata,
          name: "",
          municipality: "",
          country_name: "",
          latitude: 0,
          longitude: 0,
        },
        destination: {
          icao_code: scraped.destination.icao,
          iata_code: scraped.destination.iata,
          name: "",
          municipality: "",
          country_name: "",
          latitude: 0,
          longitude: 0,
        },
        airline: {
          name: "",
          icao: callsign.slice(0, 3).toUpperCase(),
          iata: "",
        },
      },
    },
  };
}
