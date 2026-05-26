import { ZOOM_APPROACH } from "../../../utils/airportMapDisplay.js";
import { getDistanceNm } from "../../../utils/aircraftTrafficIntent.js";

// Fallback used when the caller doesn't supply a ground-area radius.
// Matches the focal-airport's default first-ring interval so the
// ground filter aligns with the visual layer.
const DEFAULT_GROUND_AREA_RADIUS_NM = 3;
const EARTH_RADIUS_NM = 3440.065;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export const resolveDocumentTheme = (documentElement) =>
  documentElement?.getAttribute("data-theme") === "light" ? "light" : "dark";

export const getMapOverlayTheme = (theme) =>
  theme === "light"
    ? {
        labelShadowColor: "var(--map-label-shadow)",
        attributionColor: "var(--map-attribution)",
      }
    : {
        labelShadowColor: "var(--map-label-shadow)",
        attributionColor: "var(--map-attribution)",
      };

const toFiniteCoordinate = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const normalizeLongitude = (lon) => ((((lon + 180) % 360) + 360) % 360) - 180;

const getBearingRad = (from, to) => {
  const fromLat = from.lat * DEG_TO_RAD;
  const toLat = to.lat * DEG_TO_RAD;
  const deltaLon = (to.lon - from.lon) * DEG_TO_RAD;
  const y = Math.sin(deltaLon) * Math.cos(toLat);
  const x =
    Math.cos(fromLat) * Math.sin(toLat) -
    Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLon);
  return Math.atan2(y, x);
};

const destinationPoint = (origin, bearingRad, distanceNm) => {
  const angularDistance = distanceNm / EARTH_RADIUS_NM;
  const originLat = origin.lat * DEG_TO_RAD;
  const originLon = origin.lon * DEG_TO_RAD;
  const destinationLat = Math.asin(
    Math.sin(originLat) * Math.cos(angularDistance) +
      Math.cos(originLat) * Math.sin(angularDistance) * Math.cos(bearingRad),
  );
  const destinationLon =
    originLon +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(originLat),
      Math.cos(angularDistance) - Math.sin(originLat) * Math.sin(destinationLat),
    );

  return {
    lat: destinationLat * RAD_TO_DEG,
    lon: normalizeLongitude(destinationLon * RAD_TO_DEG),
  };
};

export const clampMapCenterToRadius = ({ center, focalCenter, radiusNm }) => {
  const centerLat = toFiniteCoordinate(center?.lat);
  const centerLon = toFiniteCoordinate(center?.lon);
  const focalLat = toFiniteCoordinate(focalCenter?.lat);
  const focalLon = toFiniteCoordinate(focalCenter?.lon);
  const limitNm = toFiniteCoordinate(radiusNm);

  if (
    centerLat == null ||
    centerLon == null ||
    focalLat == null ||
    focalLon == null ||
    limitNm == null ||
    limitNm <= 0
  ) {
    return null;
  }

  const currentCenter = { lat: centerLat, lon: centerLon };
  const focal = { lat: focalLat, lon: focalLon };
  const distanceNm = getDistanceNm(
    focal.lat,
    focal.lon,
    currentCenter.lat,
    currentCenter.lon,
  );
  if (distanceNm == null || distanceNm <= limitNm) return currentCenter;

  return destinationPoint(focal, getBearingRad(focal, currentCenter), limitNm);
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

const isInsideAirportGroundArea = (aircraft, airport, radiusNm) => {
  const distNm = getDistanceNm(airport.lat, airport.lon, aircraft.lat, aircraft.lon);
  return distNm != null && distNm <= radiusNm;
};

export const getVisibleAircraft = ({
  aircraft,
  airportLat,
  airportLon,
  nearbyAirports = [],
  zoom,
  groundAreaRadiusNm = DEFAULT_GROUND_AREA_RADIUS_NM,
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
    return !groundFilters.some((airport) =>
      isInsideAirportGroundArea(ac, airport, groundAreaRadiusNm),
    );
  });
};
