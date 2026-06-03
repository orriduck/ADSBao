import {
  normalizeRouteCallsign,
  sanitizeAirportCode,
} from "./flightRouteCallsign";
import { buildAdsbaoUserAgent } from "../../../config/siteMeta";

// adsbdb.com is the only normal public callsign-route provider we use.
// See https://www.adsbdb.com — the v0 API returns
// `{ response: { flightroute: { callsign, callsign_icao, callsign_iata,
//   airline: {...}, origin: { ... }, destination: { ... } } } }`.
const ADSBDB_BASE = "https://api.adsbdb.com/v0";

export const ADSBDB_USER_AGENT =
  buildAdsbaoUserAgent("adsbdb/v0");

const cleanString = (value) => String(value || "").trim();
const cleanUpper = (value) => cleanString(value).toUpperCase();
const numberOrNull = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
const inRange = (value, { min, max }) =>
  Number.isFinite(value) && value >= min && value <= max;

export function buildAdsbdbCallsignRouteUrl(callsign) {
  const normalized = normalizeRouteCallsign(callsign);
  if (!normalized) return "";
  return `${ADSBDB_BASE}/callsign/${encodeURIComponent(normalized)}`;
}

function normalizeAdsbdbAirport(airport) {
  if (!airport || typeof airport !== "object") return null;
  const icao = sanitizeAirportCode(airport.icao_code ?? airport.icao);
  const iata = sanitizeAirportCode(airport.iata_code ?? airport.iata, {
    min: 3,
    max: 3,
  });
  const lat = numberOrNull(airport.latitude ?? airport.lat);
  const lon = numberOrNull(airport.longitude ?? airport.lon);
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
    name: cleanString(airport.name),
    municipality: cleanString(airport.municipality),
    country: cleanUpper(airport.country_iso_name ?? airport.country),
    lat,
    lon,
  };
}

// adsbdb's `Unknown callsign` body is also delivered with HTTP 404. The
// caller is responsible for translating non-200 statuses into nulls; this
// function only handles the happy path where the upstream gave us JSON.
export function buildAdsbdbRouteResponse(callsign, payload) {
  const flightroute = payload?.response?.flightroute;
  if (!flightroute || typeof flightroute !== "object") return null;

  const normalizedCallsign = normalizeRouteCallsign(
    flightroute.callsign || callsign,
  );
  if (!normalizedCallsign) return null;

  const origin = normalizeAdsbdbAirport(flightroute.origin);
  const destination = normalizeAdsbdbAirport(flightroute.destination);
  if (!origin || !destination) return null;

  const airlineIcao = sanitizeAirportCode(flightroute.airline?.icao, {
    min: 2,
    max: 3,
  }) || normalizedCallsign.slice(0, 3);
  const airlineIata = sanitizeAirportCode(flightroute.airline?.iata, {
    min: 2,
    max: 2,
  });

  const callsignIcao = cleanUpper(flightroute.callsign_icao) || normalizedCallsign;
  const callsignIata = cleanUpper(flightroute.callsign_iata);

  const routeIcao = `${origin.icao}-${destination.icao}`;
  const routeIata =
    origin.iata && destination.iata
      ? `${origin.iata}-${destination.iata}`
      : "";

  return {
    callsign: normalizedCallsign,
    callsignIcao,
    callsignIata,
    number: cleanString(flightroute.number),
    airline: {
      icao: airlineIcao,
      iata: airlineIata,
      name: cleanString(flightroute.airline?.name),
      callsign: "",
      iconUrl: "",
    },
    origin,
    destination,
    route: { icao: routeIcao, iata: routeIata },
    airports: [origin, destination],
    source: "adsbdb",
    confidence: "reference-data",
  };
}
