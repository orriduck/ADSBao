export const VRS_STANDING_DATA_BASE =
  "https://vrs-standing-data.adsb.lol/routes";

export const VRS_ROUTE_USER_AGENT =
  "ADSBao/0.10.0 (+https://github.com/orriduck/ADSBao) VRS-standing-data/1.0";

export const VRS_ROUTE_MISS_STATUS = 200;

const cleanString = (value) => String(value || "").trim();

const cleanUpper = (value) => cleanString(value).toUpperCase();

const numberOrNull = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const inRange = (value, { min, max }) =>
  Number.isFinite(value) && value >= min && value <= max;

const sanitizeAirportCode = (value, { min = 2, max = 4 } = {}) => {
  const code = cleanUpper(value);
  return new RegExp(`^[A-Z0-9]{${min},${max}}$`).test(code) ? code : "";
};

export function normalizeRouteCallsign(rawCallsign) {
  const callsign = cleanUpper(rawCallsign).replace(/\s+/g, "");
  if (!callsign || callsign.length < 3 || !/^[A-Z][A-Z0-9]{2,7}$/.test(callsign)) {
    return "";
  }
  return callsign;
}

export function buildVrsRouteUrl(callsign) {
  const normalized = normalizeRouteCallsign(callsign);
  if (!normalized) return "";
  const prefix = normalized.slice(0, 2);
  return `${VRS_STANDING_DATA_BASE}/${encodeURIComponent(prefix)}/${encodeURIComponent(normalized)}.json`;
}

function normalizeAirport(airport) {
  const lat = numberOrNull(airport?.lat);
  const lon = numberOrNull(airport?.lon);
  const icao = sanitizeAirportCode(airport?.icao, { min: 3, max: 4 });

  if (!icao || !inRange(lat, { min: -90, max: 90 }) || !inRange(lon, { min: -180, max: 180 })) {
    return null;
  }

  return {
    icao,
    iata: sanitizeAirportCode(airport?.iata, { min: 3, max: 3 }),
    name: cleanString(airport?.name),
    municipality: cleanString(airport?.location || airport?.municipality),
    country: cleanUpper(airport?.countryiso2 || airport?.country),
    lat,
    lon,
  };
}

const normalizeAirportList = (payload) => {
  const airports = Array.isArray(payload?._airports) ? payload._airports : [];
  return airports.map(normalizeAirport);
};

const cleanRouteCode = (value) => {
  const route = cleanUpper(value);
  if (!route || route === "UNKNOWN") return "";
  return route;
};

const airportMatchesTarget = (airport, targetAirport = {}) => {
  const targetIcao = sanitizeAirportCode(targetAirport.icao, { min: 3, max: 4 });
  const targetIata = sanitizeAirportCode(targetAirport.iata, { min: 3, max: 3 });
  if (!targetIcao && !targetIata) return true;
  return (
    (targetIcao && airport?.icao === targetIcao) ||
    (targetIata && airport?.iata === targetIata)
  );
};

const routeAirportSetHasTarget = (route, targetAirport = {}) => {
  const airports = Array.isArray(route?.airports) && route.airports.length > 0
    ? route.airports
    : [route?.origin, route?.destination].filter(Boolean);
  return airports.some((airport) => airportMatchesTarget(airport, targetAirport));
};

export function shouldUseAerodataboxFallback(route, targetAirport = {}) {
  if (!route) return false;
  if (Array.isArray(route.airports) && route.airports.length > 2) return true;
  return !routeAirportSetHasTarget(route, targetAirport);
}

export function buildVrsRouteResponse(callsign, payload) {
  const normalizedCallsign = normalizeRouteCallsign(
    payload?.callsign || callsign,
  );
  if (!normalizedCallsign) return null;

  const icaoRoute = cleanRouteCode(payload?.airport_codes);
  if (!icaoRoute) return null;

  const airports = normalizeAirportList(payload);
  if (airports.some((airport) => !airport)) return null;

  const validAirports = airports.filter(Boolean);
  if (validAirports.length < 2) return null;

  const origin = validAirports[0];
  const destination = validAirports[validAirports.length - 1];
  const airlineIcao = sanitizeAirportCode(payload?.airline_code, {
    min: 2,
    max: 3,
  }) || normalizedCallsign.slice(0, 3);

  return {
    callsign: normalizedCallsign,
    number: cleanString(payload?.number),
    airline: {
      icao: airlineIcao,
      iata: "",
      name: "",
      callsign: "",
      iconUrl: "",
    },
    origin,
    destination,
    route: {
      icao: icaoRoute,
      iata: cleanRouteCode(payload?._airport_codes_iata),
    },
    airports: validAirports,
    source: "vrs-standing-data",
    confidence: "reference-data",
  };
}
