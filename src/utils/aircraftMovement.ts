export const DEPARTURE = "DEPARTURE";
export const ARRIVAL = "ARRIVAL";
export const UNKNOWN = "UNKNOWN";

/**
 * Resolve an aircraft's movement at this airport using only its flight route.
 * Origin ICAO/IATA match → DEPARTURE; destination match → ARRIVAL; else UNKNOWN.
 *
 * @param {object|null} route - route with origin.icao/iata and destination.icao/iata
 * @param {string} currentIcao - ICAO of the viewed airport
 * @param {string|null} currentIata - IATA of the viewed airport (optional)
 * @returns {"DEPARTURE"|"ARRIVAL"|"UNKNOWN"}
 */
export function resolveMovement(route, currentIcao, currentIata = null) {
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

  if (isOrigin) return DEPARTURE;
  if (isDest) return ARRIVAL;
  return UNKNOWN;
}
