import { AIRPORT_FALLBACKS, COORDS } from "../../../data/airportFallbacks.js";
import { enrichAircraftWithAirportContext } from "../context/airportContextModel.js";
import { resolveMovement, UNKNOWN } from "../../../utils/aircraftMovement.js";
import { normalizeCallsign } from "../../../utils/callsign.js";
import { formatFlightRouteLabel } from "../../../utils/flightRouteDisplay.js";

export function resolveAirportProfile({ icao = "", airport = null } = {}) {
  const normalizedIcao = String(airport?.icao || icao || "").toUpperCase();
  const airportFallback = AIRPORT_FALLBACKS[normalizedIcao] || null;
  const airportCodeLabel =
    airport?.iata || airportFallback?.iata || normalizedIcao;

  return {
    icao: normalizedIcao,
    iata: airportCodeLabel,
    name: airport?.name || airportFallback?.name || normalizedIcao || "Airport",
    localizedName: airport?.localizedName || "",
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
    const flightRouteLabel = formatFlightRouteLabel(route);
    // Tie movement to a renderable label so the marker color and the
    // sidebar row text never disagree. A partial route (origin known,
    // destination missing — common in AeroDataBox responses for flights
    // mid-departure) would otherwise color the marker DEPARTURE while
    // leaving the route text empty.
    const movement = flightRouteLabel
      ? resolveMovement(route, airportProfile?.icao, airportProfile?.iata)
      : UNKNOWN;

    return {
      ...item,
      flightRoute: route,
      movement,
      flightRouteLabel,
    };
  });

  return enrichAircraftWithAirportContext({
    aircraft: aircraftWithRoutes,
    airportProfile,
    airspaceVolumes,
  });
}

const aircraftSelectionId = (aircraft) => aircraft?.icao24 || aircraft?.callsign || "";

const LIVE_POSITION_FIELDS = [
  "lat",
  "lon",
  "altitude",
  "baroRate",
  "geomRate",
  "navAltitudeMcp",
  "onGround",
  "velocity",
  "track",
  "positionTime",
  "receiveTime",
  "positionQuality",
];

export function mergeTrackedAircraftIntoNearby({
  trackedAircraft = null,
  nearbyAircraft = [],
} = {}) {
  if (!trackedAircraft) return nearbyAircraft;

  const trackedKey = aircraftSelectionId(trackedAircraft);
  const matchIndex = nearbyAircraft.findIndex(
    (item) => trackedKey && aircraftSelectionId(item) === trackedKey,
  );

  if (matchIndex < 0) return [trackedAircraft, ...nearbyAircraft];

  const nearbyMatch = nearbyAircraft[matchIndex];
  const merged = {
    ...nearbyMatch,
    ...trackedAircraft,
  };

  for (const field of LIVE_POSITION_FIELDS) {
    if (nearbyMatch[field] != null) merged[field] = nearbyMatch[field];
  }

  return nearbyAircraft.map((item, index) =>
    index === matchIndex ? merged : item,
  );
}

export function resolveAirportExplorerSelection({
  aircraft = [],
  selectedAircraftId = "",
  airports = [],
  selectedAirportIcao = "",
} = {}) {
  const selectedAircraft =
    aircraft.find((item) => aircraftSelectionId(item) === selectedAircraftId) ||
    null;
  const selectedAirport =
    airports.find((airport) => airport?.icao === selectedAirportIcao) || null;

  return {
    selectedAircraft,
    selectedAircraftStillVisible: !selectedAircraftId || Boolean(selectedAircraft),
    selectedAirport,
  };
}
