import { SLOW_AIRCRAFT_THRESHOLD_KT } from "../../../utils/aircraftMotion";
import { cleanAirportCode } from "../../../utils/airport";
import { shouldDeemphasizeAirportGroundTrafficForZoom } from "./airportMapZoomFeatures";

type AirportMapCoordinate = {
  icao?: unknown;
  icao24?: string;
  lat?: unknown;
  lon?: unknown;
  elevationFt?: unknown;
  [key: string]: unknown;
};

type AirportMapAircraft = AirportMapCoordinate;

type AirportMapFocalCenterOptions = AirportMapCoordinate;

type AirportMapInitialCenterOptions = {
  focalCenter?: AirportMapCoordinate | null;
  fallbackCenter?: AirportMapCoordinate | null;
  deferUntilFocal?: boolean;
};

type NearbyAirportLayerDisplayOptions = {
  nearbyAirports?: AirportMapCoordinate[];
};

type VisibleAircraftOptions = {
  aircraft: AirportMapAircraft[];
  zoom?: unknown;
};

type SelectedAircraftTraceOptions = {
  selectedAircraftId?: unknown;
  selectedAircraft?: unknown;
  focalAircraftId?: unknown;
};

export const isLightMapTheme = (theme: unknown) =>
  theme === "light";

export const isKnownMapTheme = (theme: unknown) =>
  theme === "light" || theme === "dark";

export const resolveDocumentTheme = (documentElement: Pick<Element, "getAttribute"> | null | undefined) => {
  const theme = documentElement?.getAttribute("data-theme");
  return isKnownMapTheme(theme) ? theme : "dark";
};

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

// Only label airports that carry a real ICAO or IATA code. OpenAIP also returns
// small FAA-local-code fields (e.g. "NH14", "6B6", "8MA4") whose only identifier
// is a local id; those clutter the map without being useful spotting targets.
export const airportHasStandardCode = (airport: AirportMapCoordinate) =>
  Boolean(cleanAirportCode(airport?.icao) || cleanAirportCode(airport?.iata));

export const resolveNearbyAirportLayerDisplay = ({
  nearbyAirports = [],
}: NearbyAirportLayerDisplayOptions = {}) => ({
  airports: (Array.isArray(nearbyAirports) ? nearbyAirports : []).filter(
    airportHasStandardCode,
  ),
  showAirportBadges: true,
  showRunwayBadges: false,
});

export const shouldRenderSelectedAircraftTrace = ({
  selectedAircraftId = "",
  selectedAircraft = null,
  focalAircraftId = "",
}: SelectedAircraftTraceOptions = {}) =>
  Boolean(focalAircraftId || (selectedAircraftId && selectedAircraft));

const toFiniteCoordinate = (value: unknown) => {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const toFiniteNumber = (value: unknown) => {
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

const isSlowAirportTraffic = (aircraft: AirportMapAircraft) =>
  aircraft.onGround === true ||
  (toFiniteNumber(aircraft.velocity) ?? 0) < SLOW_AIRCRAFT_THRESHOLD_KT;

export const getVisibleAircraft = ({
  aircraft,
  zoom,
}: VisibleAircraftOptions) => {
  if (!shouldDeemphasizeAirportGroundTrafficForZoom(zoom)) {
    return aircraft.filter((ac) => ac.lat != null && ac.lon != null);
  }

  return aircraft.flatMap((ac) => {
    if (ac.lat == null || ac.lon == null) return [];
    const secondary = isSlowAirportTraffic(ac);
    return secondary ? [{ ...ac, _airportGroundTrafficSecondary: true }] : [ac];
  });
};
