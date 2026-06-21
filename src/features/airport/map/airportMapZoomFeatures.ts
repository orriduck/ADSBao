import {
  ZOOM_AIRPORT,
  ZOOM_APPROACH,
  ZOOM_DETAIL,
} from "../../../utils/airportMapDisplay";

type AirportMapZoomFeatures = {
  airportGroundTrafficHideRadiusNm: number | null;
  showAirportAreaCount: boolean;
  showNearbyAirportRunways: boolean;
  showRangeRingLabels: boolean;
  showRunwayEndLabels: boolean;
  showCandidateWatchingSpotDetails: boolean;
  showCandidateWatchingSpotBadges: boolean;
};

const DEFAULT_GROUND_AREA_RADIUS_NM = 3;

const AIRPORT_MAP_ZOOM_FEATURE_DEFAULTS: AirportMapZoomFeatures = Object.freeze({
  airportGroundTrafficHideRadiusNm: null,
  showAirportAreaCount: false,
  showNearbyAirportRunways: true,
  showRangeRingLabels: false,
  showRunwayEndLabels: false,
  showCandidateWatchingSpotDetails: true,
  showCandidateWatchingSpotBadges: false,
});

const AIRPORT_MAP_ZOOM_FEATURES_BY_LEVEL: Record<number, AirportMapZoomFeatures> = Object.freeze({
  [ZOOM_APPROACH]: Object.freeze({
    airportGroundTrafficHideRadiusNm: DEFAULT_GROUND_AREA_RADIUS_NM,
    showAirportAreaCount: true,
    showNearbyAirportRunways: true,
    showRangeRingLabels: false,
    showRunwayEndLabels: false,
    showCandidateWatchingSpotDetails: true,
    showCandidateWatchingSpotBadges: true,
  }),
  [ZOOM_AIRPORT]: Object.freeze({
    airportGroundTrafficHideRadiusNm: 0.5,
    showAirportAreaCount: true,
    showNearbyAirportRunways: true,
    showRangeRingLabels: true,
    showRunwayEndLabels: false,
    showCandidateWatchingSpotDetails: true,
    showCandidateWatchingSpotBadges: false,
  }),
  [ZOOM_DETAIL]: Object.freeze({
    airportGroundTrafficHideRadiusNm: null,
    showAirportAreaCount: false,
    showNearbyAirportRunways: true,
    showRangeRingLabels: true,
    showRunwayEndLabels: true,
    showCandidateWatchingSpotDetails: true,
    showCandidateWatchingSpotBadges: false,
  }),
});

const airportMapZoomFeaturesFor = (zoom: unknown): AirportMapZoomFeatures =>
  AIRPORT_MAP_ZOOM_FEATURES_BY_LEVEL[Number(zoom)] ??
  AIRPORT_MAP_ZOOM_FEATURE_DEFAULTS;

export const airportGroundTrafficHideRadiusNmForZoom = (zoom: unknown) =>
  airportMapZoomFeaturesFor(zoom).airportGroundTrafficHideRadiusNm;

export const shouldShowAirportAreaCountForZoom = (zoom: unknown) =>
  airportMapZoomFeaturesFor(zoom).showAirportAreaCount;

export const shouldShowNearbyAirportRunwaysForZoom = (zoom: unknown) =>
  airportMapZoomFeaturesFor(zoom).showNearbyAirportRunways;

export const shouldShowRunwayEndLabelsForZoom = (zoom: unknown) =>
  airportMapZoomFeaturesFor(zoom).showRunwayEndLabels;

export const shouldShowCandidateWatchingSpotDetailsForZoom = (zoom: unknown) =>
  airportMapZoomFeaturesFor(zoom).showCandidateWatchingSpotDetails;

export const shouldUseCandidateWatchingSpotBadgesForZoom = (zoom: unknown) => {
  const numericZoom = Number(zoom);
  if (Number.isFinite(numericZoom)) return numericZoom <= ZOOM_APPROACH;
  return airportMapZoomFeaturesFor(zoom).showCandidateWatchingSpotBadges;
};

// Level-of-detail band for runway/taxiway point lights. Keyed to the same
// zoom breakpoints as the rest of the airport map:
//   far  (<= approach)  → no point lights, approach beams only
//   mid  (airport..<detail) → edge + threshold/end + ALS dots, coarse centerline
//   near (>= detail)    → full FAA density (50ft centerline, TDZL, REIL, taxiway)
export type RunwayLightingLodBand = "far" | "mid" | "near";

const LOD_BAND_RANK: Record<RunwayLightingLodBand, number> = {
  far: 0,
  mid: 1,
  near: 2,
};

export const runwayLightingLodBandRank = (band: RunwayLightingLodBand) =>
  LOD_BAND_RANK[band] ?? 0;

export const runwayLightingLodForZoom = (zoom: unknown): RunwayLightingLodBand => {
  const numericZoom = Number(zoom);
  if (!Number.isFinite(numericZoom)) return "near";
  if (numericZoom <= ZOOM_APPROACH) return "far";
  if (numericZoom >= ZOOM_DETAIL) return "near";
  return "mid";
};
