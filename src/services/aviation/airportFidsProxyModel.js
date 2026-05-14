import {
  AERODATABOX_RAPIDAPI_BASE,
} from "./aerodataboxRouteProxyModel.js";

const cleanString = (value) => String(value || "").trim();

const cleanUpper = (value) => cleanString(value).toUpperCase();

const numberOrNull = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const sanitizeCode = (value, { min = 2, max = 4 } = {}) => {
  const code = cleanUpper(value);
  return new RegExp(`^[A-Z0-9]{${min},${max}}$`).test(code) ? code : "";
};

const normalizeDirection = (direction) => {
  switch (cleanUpper(direction)) {
    case "ARRIVAL":
      return "Arrival";
    case "DEPARTURE":
      return "Departure";
    default:
      return "Both";
  }
};

const cleanFlightNumber = (number, airline = {}) => {
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
};

const createConvertedCallsigns = (flightNumber, airline = {}) => {
  const number = cleanUpper(flightNumber).replace(/\s+/g, "");
  if (!number) return [];

  return [
    sanitizeCode(airline.iata, { min: 2, max: 2 }),
    sanitizeCode(airline.icao, { min: 2, max: 3 }),
  ]
    .filter(Boolean)
    .map((code) => `${code}${number}`);
};

function normalizeAirport(airport) {
  if (!airport || typeof airport !== "object") return null;

  const location = airport.location || {};
  const lat = numberOrNull(location.lat ?? location.latitude ?? airport.lat);
  const lon = numberOrNull(location.lon ?? location.longitude ?? airport.lon);

  return {
    icao: sanitizeCode(airport.icao, { min: 3, max: 4 }),
    iata: sanitizeCode(airport.iata, { min: 3, max: 3 }),
    name: cleanString(airport.name || airport.shortName),
    municipality: cleanString(
      airport.municipalityName || airport.municipality || airport.city,
    ),
    country: sanitizeCode(airport.countryCode || airport.country, {
      min: 2,
      max: 2,
    }),
    lat,
    lon,
  };
}

const normalizeFocusAirport = (airport) => ({
  icao: sanitizeCode(airport?.icao, { min: 3, max: 4 }),
  iata: sanitizeCode(airport?.iata, { min: 3, max: 3 }),
  name: cleanString(airport?.name),
  municipality: cleanString(airport?.municipality || airport?.city),
  country: sanitizeCode(airport?.country, { min: 2, max: 2 }),
  lat: numberOrNull(airport?.lat),
  lon: numberOrNull(airport?.lon),
});

const airportOrFocus = (airport, focusAirport) =>
  normalizeAirport(airport) || normalizeFocusAirport(focusAirport);

const directionKeyFromBucket = (bucket) =>
  cleanUpper(bucket) === "DEPARTURES" ? "departure" : "arrival";

const timeValue = (time) => cleanString(time?.local || time?.utc);

const buildFlightId = ({
  direction,
  callsign,
  convertedCallsigns,
  flightNumber,
  scheduledTimeLocal,
  origin,
  destination,
}) =>
  [
    direction,
    callsign || convertedCallsigns[1] || convertedCallsigns[0] || flightNumber,
    scheduledTimeLocal,
    origin?.icao || origin?.iata,
    destination?.icao || destination?.iata,
  ]
    .filter(Boolean)
    .join(":");

function normalizeAirportFidsFlight(rawFlight, direction, focusAirport) {
  const departureAirport = airportOrFocus(rawFlight?.departure?.airport, focusAirport);
  const arrivalAirport = airportOrFocus(rawFlight?.arrival?.airport, focusAirport);
  const flightDirection = directionKeyFromBucket(direction);
  const origin =
    flightDirection === "arrival" ? departureAirport : departureAirport || normalizeFocusAirport(focusAirport);
  const destination =
    flightDirection === "arrival" ? arrivalAirport || normalizeFocusAirport(focusAirport) : arrivalAirport;
  const airline = {
    iata: sanitizeCode(rawFlight?.airline?.iata, { min: 2, max: 2 }),
    icao: sanitizeCode(rawFlight?.airline?.icao, { min: 2, max: 3 }),
    name: cleanString(rawFlight?.airline?.name),
  };
  const callsign = cleanUpper(rawFlight?.callSign).replace(/\s+/g, "");
  const flightNumber = cleanFlightNumber(rawFlight?.number, airline);
  const convertedCallsigns = createConvertedCallsigns(flightNumber, airline);
  const scheduledTimeLocal =
    flightDirection === "arrival"
      ? timeValue(rawFlight?.arrival?.scheduledTime) ||
        timeValue(rawFlight?.departure?.scheduledTime)
      : timeValue(rawFlight?.departure?.scheduledTime) ||
        timeValue(rawFlight?.arrival?.scheduledTime);

  return {
    id: buildFlightId({
      direction: flightDirection,
      callsign,
      convertedCallsigns,
      flightNumber,
      scheduledTimeLocal,
      origin,
      destination,
    }),
    direction: flightDirection,
    callsign,
    flightNumber,
    number: cleanString(rawFlight?.number),
    status: cleanString(rawFlight?.status),
    codeshareStatus: cleanString(rawFlight?.codeshareStatus),
    isCargo: Boolean(rawFlight?.isCargo),
    scheduledTimeLocal,
    origin,
    destination,
    airline,
    aircraft: {
      registration: cleanUpper(rawFlight?.aircraft?.reg),
      modeS: cleanUpper(rawFlight?.aircraft?.modeS),
      model: cleanString(rawFlight?.aircraft?.model),
    },
    matchKeys: {
      callsign,
      flightNumber,
      convertedCallsigns,
      registration: cleanUpper(rawFlight?.aircraft?.reg),
      modeS: cleanUpper(rawFlight?.aircraft?.modeS),
    },
    raw: rawFlight,
  };
}

const dedupeScore = (flight) => {
  let score = 0;
  if (flight.codeshareStatus === "IsOperator") score += 4;
  if (flight.callsign) score += 3;
  if (flight.aircraft.modeS) score += 2;
  if (flight.aircraft.registration) score += 1;
  return score;
};

export function dedupeAirportFidsFlights(flights) {
  const bestById = new Map();

  for (const flight of flights || []) {
    const key = flight?.id;
    if (!key) continue;
    const prior = bestById.get(key);
    if (!prior || dedupeScore(flight) > dedupeScore(prior)) {
      bestById.set(key, flight);
    }
  }

  return [...bestById.values()];
}

export function buildAerodataboxAirportFidsRelativeUrl(
  airportIcao,
  {
    offsetMinutes = -180,
    durationMinutes = 720,
    direction = "Both",
    withLeg = true,
    withCodeshared = true,
    withCargo = true,
    withPrivate = true,
    withLocation = false,
  } = {},
) {
  const normalizedIcao = sanitizeCode(airportIcao, { min: 3, max: 4 });
  const url = new URL(
    `/flights/airports/icao/${encodeURIComponent(normalizedIcao)}`,
    AERODATABOX_RAPIDAPI_BASE,
  );
  url.searchParams.set("offsetMinutes", String(offsetMinutes));
  url.searchParams.set("durationMinutes", String(durationMinutes));
  url.searchParams.set("direction", normalizeDirection(direction));
  url.searchParams.set("withLeg", String(withLeg));
  url.searchParams.set("withCodeshared", String(withCodeshared));
  url.searchParams.set("withCargo", String(withCargo));
  url.searchParams.set("withPrivate", String(withPrivate));
  url.searchParams.set("withLocation", String(withLocation));
  return url.toString();
}

export function buildAerodataboxAirportFidsWindowUrl(
  airportIcao,
  fromLocal,
  toLocal,
  {
    withLeg = true,
    withCodeshared = true,
    withCargo = true,
    withPrivate = true,
    withLocation = false,
  } = {},
) {
  const normalizedIcao = sanitizeCode(airportIcao, { min: 3, max: 4 });
  const url = new URL(
    `/flights/airports/icao/${encodeURIComponent(normalizedIcao)}/${encodeURIComponent(
      cleanString(fromLocal),
    )}/${encodeURIComponent(cleanString(toLocal))}`,
    AERODATABOX_RAPIDAPI_BASE,
  );
  url.searchParams.set("withLeg", String(withLeg));
  url.searchParams.set("withCodeshared", String(withCodeshared));
  url.searchParams.set("withCargo", String(withCargo));
  url.searchParams.set("withPrivate", String(withPrivate));
  url.searchParams.set("withLocation", String(withLocation));
  return url.toString();
}

export function buildAerodataboxAirportFeedsHealthUrl(airportIcao) {
  const normalizedIcao = sanitizeCode(airportIcao, { min: 3, max: 4 });
  return new URL(
    `/health/services/airports/${encodeURIComponent(normalizedIcao)}/feeds`,
    AERODATABOX_RAPIDAPI_BASE,
  ).toString();
}

export function normalizeAirportFidsFeedCoverage(payload) {
  return {
    airportFeedsOk:
      cleanUpper(payload?.flightSchedulesFeed?.status) === "OK" &&
      cleanUpper(payload?.liveFlightUpdatesFeed?.status) === "OK",
    flightSchedulesStatus: cleanString(payload?.flightSchedulesFeed?.status),
    liveUpdatesStatus: cleanString(payload?.liveFlightUpdatesFeed?.status),
    adsbUpdatesStatus: cleanString(payload?.adsbUpdatesFeed?.status),
    minAvailableLocalDate: cleanString(
      payload?.generalAvailability?.minAvailableLocalDate ||
        payload?.flightSchedulesFeed?.minAvailableLocalDate,
    ),
    maxAvailableLocalDate: cleanString(
      payload?.generalAvailability?.maxAvailableLocalDate ||
        payload?.flightSchedulesFeed?.maxAvailableLocalDate,
    ),
  };
}

export function flattenAirportFidsResponse(payload, { focusAirport } = {}) {
  const flattened = [];
  for (const [bucket, flights] of Object.entries(payload || {})) {
    if (!Array.isArray(flights)) continue;
    for (const flight of flights) {
      flattened.push(normalizeAirportFidsFlight(flight, bucket, focusAirport));
    }
  }
  return dedupeAirportFidsFlights(flattened);
}
