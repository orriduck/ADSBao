import { AIRPORT_FALLBACKS, COORDS } from "../../data/airportFallbacks.js";
import { enrichAircraftWithAirportContext } from "../airport-context/airportContextModel.js";
import { resolveMovement } from "../../utils/aircraftMovement.js";
import { normalizeCallsign } from "../../utils/callsign.js";
import { formatFlightRouteLabel } from "../../utils/flightRouteDisplay.js";

export function resolveAirportProfile({ icao = "", airport = null } = {}) {
  const normalizedIcao = String(airport?.icao || icao || "").toUpperCase();
  const airportFallback = AIRPORT_FALLBACKS[normalizedIcao] || null;
  const airportCodeLabel =
    airport?.iata || airportFallback?.iata || normalizedIcao;

  return {
    icao: normalizedIcao,
    iata: airportCodeLabel,
    name: airport?.name || airportFallback?.name || normalizedIcao || "Airport",
    city: airport?.city || airportFallback?.city || "",
    country: airport?.country || airportFallback?.country || "",
    lat: COORDS[normalizedIcao]?.[0] || airport?.lat || 0,
    lon: COORDS[normalizedIcao]?.[1] || airport?.lon || 0,
  };
}

export function enrichAircraftWithRoutes({
  aircraft = [],
  routesByCallsign = {},
  airportProfile,
  airspaceVolumes = [],
} = {}) {
  const aircraftWithRoutes = aircraft.map((item) => {
    const key = normalizeCallsign(item.callsign);
    const route = routesByCallsign[key] || null;
    const movement = resolveMovement(route, airportProfile?.icao, airportProfile?.iata, {
      aircraft: item,
      airport: airportProfile,
    });

    return {
      ...item,
      flightRoute: route,
      movement,
      flightRouteLabel: formatFlightRouteLabel(route),
    };
  });

  return enrichAircraftWithAirportContext({
    aircraft: aircraftWithRoutes,
    airportProfile,
    airspaceVolumes,
  });
}
