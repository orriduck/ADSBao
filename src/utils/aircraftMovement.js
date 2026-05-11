export const DEPARTURE = "DEPARTURE";
export const ARRIVAL = "ARRIVAL";
export const UNKNOWN = "UNKNOWN";

const ROUND_TRIP_TRACK_ALIGNMENT_DEG = 75;

const toFiniteNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const toDegrees = (radians) => (radians * 180) / Math.PI;

const normalizeHeading = (value) => {
  const heading = toFiniteNumber(value);
  if (heading == null) return null;
  return ((heading % 360) + 360) % 360;
};

const angularDelta = (a, b) => {
  const headingA = normalizeHeading(a);
  const headingB = normalizeHeading(b);
  if (headingA == null || headingB == null) return null;
  const delta = Math.abs(headingA - headingB) % 360;
  return delta > 180 ? 360 - delta : delta;
};

const bearingDegrees = (fromLat, fromLon, toLat, toLon) => {
  const lat1 = toFiniteNumber(fromLat);
  const lon1 = toFiniteNumber(fromLon);
  const lat2 = toFiniteNumber(toLat);
  const lon2 = toFiniteNumber(toLon);
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
    return null;
  }

  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const lambdaDelta = toRadians(lon2 - lon1);
  const y = Math.sin(lambdaDelta) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(lambdaDelta);

  return normalizeHeading(toDegrees(Math.atan2(y, x)));
};

const normalizeIntentMovement = (value) => {
  const intent = String(value || "").toLowerCase();
  if (intent === "arrival") return ARRIVAL;
  if (intent === "departure") return DEPARTURE;
  return UNKNOWN;
};

function resolveSameAirportMovement(route, aircraft, airport) {
  const intentMovement = normalizeIntentMovement(aircraft?.trafficIntent);
  if (intentMovement !== UNKNOWN) return intentMovement;

  const track = normalizeHeading(aircraft?.track);
  const aircraftLat = toFiniteNumber(aircraft?.lat);
  const aircraftLon = toFiniteNumber(aircraft?.lon);
  const airportLat = toFiniteNumber(
    airport?.lat ?? route?.destination?.lat ?? route?.origin?.lat,
  );
  const airportLon = toFiniteNumber(
    airport?.lon ?? route?.destination?.lon ?? route?.origin?.lon,
  );
  if (
    track == null ||
    aircraftLat == null ||
    aircraftLon == null ||
    airportLat == null ||
    airportLon == null
  ) {
    return UNKNOWN;
  }

  const toAirport = bearingDegrees(aircraftLat, aircraftLon, airportLat, airportLon);
  const awayFromAirport = normalizeHeading(toAirport + 180);
  const arrivalDelta = angularDelta(track, toAirport);
  const departureDelta = angularDelta(track, awayFromAirport);

  if (
    arrivalDelta != null &&
    departureDelta != null &&
    arrivalDelta <= ROUND_TRIP_TRACK_ALIGNMENT_DEG &&
    arrivalDelta < departureDelta
  ) {
    return ARRIVAL;
  }

  if (
    arrivalDelta != null &&
    departureDelta != null &&
    departureDelta <= ROUND_TRIP_TRACK_ALIGNMENT_DEG &&
    departureDelta < arrivalDelta
  ) {
    return DEPARTURE;
  }

  return UNKNOWN;
}

/**
 * Resolve an aircraft's movement at this airport.
 * Simple routes use origin/destination matches. Same-airport round trips use
 * current aircraft intent/track to infer the active leg.
 *
 * @param {object|null} route - route with origin.icao/iata and destination.icao/iata
 * @param {string} currentIcao - ICAO of the viewed airport
 * @param {string|null} currentIata - IATA of the viewed airport (optional)
 * @returns {"DEPARTURE"|"ARRIVAL"|"UNKNOWN"}
 */
export function resolveMovement(route, currentIcao, currentIata = null, context = {}) {
  if (!route || !currentIcao) return UNKNOWN;
  const icao = currentIcao.toUpperCase();
  const iata = currentIata ? String(currentIata).toUpperCase() : null;

  const originIcao = (route.origin?.icao || "").toUpperCase();
  const originIata = (route.origin?.iata || "").toUpperCase();
  const destIcao = (route.destination?.icao || "").toUpperCase();
  const destIata = (route.destination?.iata || "").toUpperCase();

  const isOrigin =
    originIcao === icao || (iata && originIata === iata && originIata !== "");
  const isDest =
    destIcao === icao || (iata && destIata === iata && destIata !== "");

  if (isOrigin && isDest) {
    return resolveSameAirportMovement(route, context.aircraft, {
      ...context.airport,
      icao,
      iata,
    });
  }

  if (isOrigin) return DEPARTURE;
  if (isDest) return ARRIVAL;
  return UNKNOWN;
}
