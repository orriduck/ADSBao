import { ZOOM_APPROACH } from "../../../utils/airportMapDisplay";
import { getDistanceNm } from "../../../utils/aircraftTrafficIntent";

// Fallback used when the caller doesn't supply a ground-area radius.
// Matches the focal-airport's default first-ring interval so the
// ground filter aligns with the visual layer.
const DEFAULT_GROUND_AREA_RADIUS_NM = 3;

type AirportMapCoordinate = {
  icao?: unknown;
  icao24?: string;
  lat?: unknown;
  lon?: unknown;
  [key: string]: unknown;
};

type AirportMapAircraft = AirportMapCoordinate;

type AirportMapFocalCenterOptions = AirportMapCoordinate;

type AirportMapInitialCenterOptions = {
  focalCenter?: AirportMapCoordinate | null;
  fallbackCenter?: AirportMapCoordinate | null;
  deferUntilFocal?: boolean;
};

type AirportGroundFilterOptions = {
  airportLat?: unknown;
  airportLon?: unknown;
  nearbyAirports?: AirportMapCoordinate[];
};

type VisibleAircraftOptions = AirportGroundFilterOptions & {
  aircraft: AirportMapAircraft[];
  zoom?: unknown;
  groundAreaRadiusNm?: number;
};

export const resolveDocumentTheme = (documentElement: Pick<Element, "getAttribute"> | null | undefined) =>
  documentElement?.getAttribute("data-theme") === "light" ? "light" : "dark";

export const getMapOverlayTheme = (theme: unknown) =>
  theme === "light"
    ? {
        labelShadowColor: "var(--map-label-shadow)",
        attributionColor: "var(--map-attribution)",
      }
    : {
        labelShadowColor: "var(--map-label-shadow)",
        attributionColor: "var(--map-attribution)",
      };

const toFiniteCoordinate = (value: unknown) => {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export const resolveAirportMapFocalCenter = ({ lat, lon }: AirportMapFocalCenterOptions = {}) => {
  const focalLat = toFiniteCoordinate(lat);
  const focalLon = toFiniteCoordinate(lon);
  if (focalLat == null || focalLon == null) return null;
  return { lat: focalLat, lon: focalLon };
};

export const resolveAirportMapInitialCenter = ({
  focalCenter = null,
  fallbackCenter = null,
  deferUntilFocal = false,
}: AirportMapInitialCenterOptions = {}) => {
  if (focalCenter) return focalCenter;
  if (deferUntilFocal) return null;
  return resolveAirportMapFocalCenter({
    lat: fallbackCenter?.lat,
    lon: fallbackCenter?.lon,
  });
};

export const formatCoordinateLabel = (value: number, axis: string) => {
  if (!value) return "";
  const positiveSuffix = axis === "lat" ? "N" : "E";
  const negativeSuffix = axis === "lat" ? "S" : "W";
  return `${Math.abs(value).toFixed(2)}${value >= 0 ? positiveSuffix : negativeSuffix}`;
};

const airportGroundFilters = ({ airportLat, airportLon, nearbyAirports = [] }: AirportGroundFilterOptions) =>
  [
    { lat: airportLat, lon: airportLon },
    ...nearbyAirports.map((airport) => ({
      lat: airport?.lat,
      lon: airport?.lon,
    })),
  ].filter((airport) => airport.lat != null && airport.lon != null);

const isInsideAirportGroundArea = (aircraft: AirportMapAircraft, airport: AirportMapCoordinate, radiusNm: number) => {
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
}: VisibleAircraftOptions) => {
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
