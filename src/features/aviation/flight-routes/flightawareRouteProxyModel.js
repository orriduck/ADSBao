import {
  normalizeRouteCallsign,
  sanitizeAirportCode,
} from "./flightRouteCallsign.js";

export const FLIGHTAWARE_BASE = "https://www.flightaware.com/live/flight";

export const FLIGHTAWARE_USER_AGENT =
  "ADSBao/1.3.0 (+https://github.com/orriduck/ADSBao) flightaware/html";

const cleanString = (value) => String(value || "").trim();
const cleanUpper = (value) => cleanString(value).toUpperCase();
const numberOrNull = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
const inRange = (value, { min, max }) =>
  Number.isFinite(value) && value >= min && value <= max;

const htmlDecode = (value) =>
  cleanString(value)
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");

const escapeRegExp = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function extractMetaContent(html, key) {
  const escaped = escapeRegExp(key);
  const patterns = [
    new RegExp(
      `<meta\\b(?=[^>]*(?:name|property)=["']${escaped}["'])(?=[^>]*content=["']([^"']*)["'])[^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta\\b(?=[^>]*content=["']([^"']*)["'])(?=[^>]*(?:name|property)=["']${escaped}["'])[^>]*>`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match?.[1]) return htmlDecode(match[1]);
  }
  return "";
}

function extractTitle(html) {
  const match = /<title[^>]*>([^<]*)<\/title>/i.exec(String(html || ""));
  return htmlDecode(match?.[1] || extractMetaContent(html, "title"));
}

function extractAirlineName({ title, description }) {
  const titleMatch =
    /\)\s+(.+?)\s+Flight Tracking(?:\s+and\s+History)?/i.exec(title);
  if (titleMatch?.[1]) return cleanString(titleMatch[1]);

  const descriptionMatch = /^Track\s+(.+?)\s+\([A-Z0-9]{2,3}\)\s+#/i.exec(
    description,
  );
  return cleanString(descriptionMatch?.[1] || "");
}

function extractIataAndNumber({ callsign, title, description }) {
  const titleMatch = /^([A-Z0-9]{2})(\d{1,5}[A-Z]?)\s+\(/i.exec(title);
  if (titleMatch) {
    return {
      airlineIata: cleanUpper(titleMatch[1]),
      number: cleanUpper(titleMatch[2]),
    };
  }

  const descriptionMatch = /\(([A-Z0-9]{2})\)\s+#(\d{1,5}[A-Z]?)/i.exec(
    description,
  );
  if (descriptionMatch) {
    return {
      airlineIata: cleanUpper(descriptionMatch[1]),
      number: cleanUpper(descriptionMatch[2]),
    };
  }

  const callsignMatch = /^[A-Z]{2,3}(\d{1,5}[A-Z]?)$/.exec(callsign);
  return {
    airlineIata: "",
    number: cleanUpper(callsignMatch?.[1] || ""),
  };
}

function normalizeDirectoryAirport(airport) {
  if (!airport || typeof airport !== "object") return null;
  const lat = numberOrNull(airport.lat);
  const lon = numberOrNull(airport.lon);
  const icao = sanitizeAirportCode(airport.icao || airport.ident || airport.code);
  if (
    !icao ||
    !inRange(lat, { min: -90, max: 90 }) ||
    !inRange(lon, { min: -180, max: 180 })
  ) {
    return null;
  }

  return {
    icao,
    iata: sanitizeAirportCode(airport.iata, { min: 3, max: 3 }),
    name: cleanString(airport.name),
    municipality: cleanString(airport.city || airport.municipality),
    country: cleanUpper(airport.country),
    lat,
    lon,
  };
}

export function buildFlightAwareCallsignRouteUrl(callsign) {
  const normalized = normalizeRouteCallsign(callsign);
  if (!normalized) return "";
  return `${FLIGHTAWARE_BASE}/${encodeURIComponent(normalized)}`;
}

export function buildFlightAwareAirlineLogoUrl(airlineIcao) {
  const normalized = sanitizeAirportCode(airlineIcao, { min: 2, max: 3 });
  return normalized
    ? `https://www.flightaware.com/images/airline_logos/90p/${normalized}.png`
    : "";
}

export function parseFlightAwareRoutePage(callsign, html) {
  const normalizedCallsign = normalizeRouteCallsign(callsign);
  if (!normalizedCallsign) return null;

  const originIcao = sanitizeAirportCode(extractMetaContent(html, "origin"));
  const destinationIcao = sanitizeAirportCode(
    extractMetaContent(html, "destination"),
  );
  const airlineIcao =
    sanitizeAirportCode(extractMetaContent(html, "airline"), {
      min: 2,
      max: 3,
    }) || normalizedCallsign.slice(0, 3);
  if (!originIcao || !destinationIcao || !airlineIcao) return null;

  const title = extractTitle(html);
  const description =
    extractMetaContent(html, "twitter:description") ||
    extractMetaContent(html, "og:description") ||
    extractMetaContent(html, "description");
  const { airlineIata, number } = extractIataAndNumber({
    callsign: normalizedCallsign,
    title,
    description,
  });

  return {
    callsign: normalizedCallsign,
    callsignIcao: normalizedCallsign,
    callsignIata: airlineIata && number ? `${airlineIata}${number}` : "",
    number,
    airline: {
      icao: airlineIcao,
      iata: airlineIata,
      name: extractAirlineName({ title, description }),
      callsign: "",
      iconUrl: buildFlightAwareAirlineLogoUrl(airlineIcao),
    },
    originIcao,
    destinationIcao,
  };
}

export async function buildFlightAwareRouteResponse({
  callsign,
  html,
  resolveAirportByIdent,
} = {}) {
  const parsed = parseFlightAwareRoutePage(callsign, html);
  if (!parsed || typeof resolveAirportByIdent !== "function") return null;

  const [origin, destination] = await Promise.all([
    resolveAirportByIdent(parsed.originIcao),
    resolveAirportByIdent(parsed.destinationIcao),
  ]);
  const normalizedOrigin = normalizeDirectoryAirport(origin);
  const normalizedDestination = normalizeDirectoryAirport(destination);
  if (!normalizedOrigin || !normalizedDestination) return null;

  const routeIata =
    normalizedOrigin.iata && normalizedDestination.iata
      ? `${normalizedOrigin.iata}-${normalizedDestination.iata}`
      : "";

  return {
    callsign: parsed.callsign,
    callsignIcao: parsed.callsignIcao,
    callsignIata: parsed.callsignIata,
    number: parsed.number,
    airline: parsed.airline,
    origin: normalizedOrigin,
    destination: normalizedDestination,
    route: {
      icao: `${normalizedOrigin.icao}-${normalizedDestination.icao}`,
      iata: routeIata,
    },
    airports: [normalizedOrigin, normalizedDestination],
    source: "flightaware",
    confidence: "scraped-reference",
  };
}
