import { AIRPORT_AREA_RADIUS_NM } from "../../config/airportMap.js";
import { ZOOM_APPROACH } from "../../utils/airportMapDisplay.js";
import { getDistanceNm } from "../../utils/aircraftTrafficIntent.js";

export const resolveDocumentTheme = (documentElement) =>
  documentElement?.getAttribute("data-theme") === "light" ? "light" : "dark";

export const getMapOverlayTheme = (theme) =>
  theme === "light"
    ? {
        labelShadowColor: "rgba(250,249,245,0.95)",
        attributionColor: "rgba(14,26,43,0.45)",
      }
    : {
        labelShadowColor: "#041a38",
        attributionColor: "rgba(245,247,250,0.3)",
      };

export const formatCoordinateLabel = (value, axis) => {
  if (!value) return "";
  const positiveSuffix = axis === "lat" ? "N" : "E";
  const negativeSuffix = axis === "lat" ? "S" : "W";
  return `${Math.abs(value).toFixed(2)}${value >= 0 ? positiveSuffix : negativeSuffix}`;
};

const airportGroundFilters = ({ airportLat, airportLon, nearbyAirports = [] }) =>
  [
    { lat: airportLat, lon: airportLon },
    ...nearbyAirports.map((airport) => ({
      lat: airport?.lat,
      lon: airport?.lon,
    })),
  ].filter((airport) => airport.lat != null && airport.lon != null);

const isInsideAirportGroundArea = (aircraft, airport) => {
  const distNm = getDistanceNm(airport.lat, airport.lon, aircraft.lat, aircraft.lon);
  return distNm != null && distNm <= AIRPORT_AREA_RADIUS_NM;
};

export const getVisibleAircraft = ({
  aircraft,
  airportLat,
  airportLon,
  nearbyAirports = [],
  zoom,
}) => {
  const atApproachZoom = Number(zoom) === ZOOM_APPROACH;
  const groundFilters = airportGroundFilters({
    airportLat,
    airportLon,
    nearbyAirports,
  });

  return aircraft.filter((ac) => {
    if (ac.lat == null || ac.lon == null) return false;
    if (!atApproachZoom) return true;
    return !groundFilters.some((airport) => isInsideAirportGroundArea(ac, airport));
  });
};
