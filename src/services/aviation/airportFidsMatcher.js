const EARTH_RADIUS_NM = 3440.065;

const cleanString = (value) => String(value || "").trim();

const cleanUpper = (value) => cleanString(value).toUpperCase();

const normalizeCallsignLike = (value) => cleanUpper(value).replace(/\s+/g, "");

const normalizeDateLike = (value) => {
  const text = cleanString(value);
  if (!text) return NaN;
  return Date.parse(text.replace(" ", "T"));
};

const haversineNm = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const a =
    sinLat * sinLat +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinLon * sinLon;
  return 2 * EARTH_RADIUS_NM * Math.asin(Math.min(1, Math.sqrt(a)));
};

const normalizeAircraftInput = (aircraft) => ({
  icao24: normalizeCallsignLike(aircraft?.hex),
  rawCallsign: cleanString(aircraft?.flight || aircraft?.callsign),
  callsign: normalizeCallsignLike(aircraft?.flight || aircraft?.callsign),
  registration: normalizeCallsignLike(aircraft?.r || aircraft?.registration),
  lat: Number(aircraft?.lat),
  lon: Number(aircraft?.lon),
  track: Number(aircraft?.track),
  velocity: Number(aircraft?.gs ?? aircraft?.velocity),
  onGround: Boolean(aircraft?.gnd ?? aircraft?.onGround),
});

const buildMatchResponse = (aircraft, flight, matchMethod, confidence, score = 0) => ({
  rawAircraftHex: aircraft.icao24,
  rawAircraftRegistration: aircraft.registration,
  rawCallsign: aircraft.rawCallsign,
  matchedFlightId: flight?.id || "",
  matchedFlightNumber: flight?.flightNumber || "",
  airline: flight?.airline || {},
  origin: flight?.origin || null,
  destination: flight?.destination || null,
  direction: flight?.direction || "unknown",
  matchMethod,
  confidence,
  source: "aerodatabox-airport-fids",
  score,
});

const chooseClosestBySchedule = (flights, nowMs) => {
  if (flights.length <= 1) return flights[0] || null;
  return [...flights].sort((left, right) => {
    const leftDelta = Math.abs(normalizeDateLike(left?.scheduledTimeLocal) - nowMs);
    const rightDelta = Math.abs(normalizeDateLike(right?.scheduledTimeLocal) - nowMs);
    return leftDelta - rightDelta;
  })[0];
};

const collectMatches = (flights, predicate) => flights.filter(predicate);

function scoreRouteTimePositionMatch(aircraft, flight, focusAirport, nowMs) {
  const lat = Number(aircraft.lat);
  const lon = Number(aircraft.lon);
  const airportLat = Number(focusAirport?.lat);
  const airportLon = Number(focusAirport?.lon);
  const canMeasureDistance =
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Number.isFinite(airportLat) &&
    Number.isFinite(airportLon);
  const distanceNm = canMeasureDistance
    ? haversineNm(lat, lon, airportLat, airportLon)
    : null;
  const scheduledAt = normalizeDateLike(flight?.scheduledTimeLocal);
  const minutesDelta = Number.isFinite(scheduledAt)
    ? Math.abs(scheduledAt - nowMs) / 60_000
    : Infinity;

  let score = 0;

  if (flight.direction === "departure") score += 6;
  if (flight.direction === "arrival") score += 4;

  if (distanceNm != null) {
    if (distanceNm <= 5) score += 12;
    else if (distanceNm <= 15) score += 9;
    else if (distanceNm <= 30) score += 6;
    else if (distanceNm <= 60) score += 3;
  }

  if (minutesDelta <= 15) score += 12;
  else if (minutesDelta <= 45) score += 8;
  else if (minutesDelta <= 90) score += 5;
  else if (minutesDelta <= 180) score += 2;

  if (aircraft.onGround && distanceNm != null && distanceNm <= 2) score += 2;
  if (Number.isFinite(aircraft.velocity) && aircraft.velocity >= 120) score += 2;

  return score;
}

export function matchAirportFidsAircraft(
  aircraftInput,
  flights,
  {
    focusAirport = {},
    now = new Date(),
  } = {},
) {
  const aircraft = normalizeAircraftInput(aircraftInput);
  const nowMs = now instanceof Date ? now.getTime() : Number(now);

  const modeSMatches = aircraft.icao24
    ? collectMatches(flights, (flight) => flight?.matchKeys?.modeS === aircraft.icao24)
    : [];
  if (modeSMatches.length > 0) {
    return buildMatchResponse(
      aircraft,
      chooseClosestBySchedule(modeSMatches, nowMs),
      "icao24",
      "high",
      100,
    );
  }

  const registrationMatches = aircraft.registration
    ? collectMatches(
        flights,
        (flight) => flight?.matchKeys?.registration === aircraft.registration,
      )
    : [];
  if (registrationMatches.length > 0) {
    return buildMatchResponse(
      aircraft,
      chooseClosestBySchedule(registrationMatches, nowMs),
      "registration",
      "high",
      90,
    );
  }

  const callsignMatches = aircraft.callsign
    ? collectMatches(flights, (flight) => flight?.matchKeys?.callsign === aircraft.callsign)
    : [];
  if (callsignMatches.length > 0) {
    return buildMatchResponse(
      aircraft,
      chooseClosestBySchedule(callsignMatches, nowMs),
      "callsign-exact",
      "high",
      80,
    );
  }

  const convertedMatches = aircraft.callsign
    ? collectMatches(
        flights,
        (flight) => flight?.matchKeys?.convertedCallsigns?.includes(aircraft.callsign),
      )
    : [];
  if (convertedMatches.length > 0) {
    return buildMatchResponse(
      aircraft,
      chooseClosestBySchedule(convertedMatches, nowMs),
      "callsign-iata-icao-converted",
      "medium",
      65,
    );
  }

  const flightNumberMatches = aircraft.callsign
    ? collectMatches(
        flights,
        (flight) =>
          flight?.matchKeys?.flightNumber &&
          aircraft.callsign === flight.matchKeys.flightNumber,
      )
    : [];
  if (flightNumberMatches.length > 0) {
    return buildMatchResponse(
      aircraft,
      chooseClosestBySchedule(flightNumberMatches, nowMs),
      "flight-number-exact",
      "medium",
      55,
    );
  }

  let bestScoredFlight = null;
  let bestScore = -1;
  for (const flight of flights || []) {
    const score = scoreRouteTimePositionMatch(aircraft, flight, focusAirport, nowMs);
    if (score > bestScore) {
      bestScore = score;
      bestScoredFlight = flight;
    }
  }

  if (bestScoredFlight && bestScore >= 15) {
    return buildMatchResponse(
      aircraft,
      bestScoredFlight,
      "route-time-position-score",
      "low",
      bestScore,
    );
  }

  return buildMatchResponse(aircraft, null, "none", "none", 0);
}

export function matchAirportFidsAircraftList(
  aircraftList,
  flights,
  options = {},
) {
  const remainingFlights = [...(flights || [])];
  const matches = [];

  for (const aircraft of aircraftList || []) {
    const match = matchAirportFidsAircraft(aircraft, remainingFlights, options);
    matches.push(match);
    if (match.matchedFlightId) {
      const index = remainingFlights.findIndex((flight) => flight.id === match.matchedFlightId);
      if (index >= 0) remainingFlights.splice(index, 1);
    }
  }

  const summary = {
    high: matches.filter((item) => item.confidence === "high").length,
    medium: matches.filter((item) => item.confidence === "medium").length,
    low: matches.filter((item) => item.confidence === "low").length,
    unmatched: matches.filter((item) => item.confidence === "none").length,
  };

  return { matches, summary };
}
