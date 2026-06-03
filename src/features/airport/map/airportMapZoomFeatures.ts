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
  showCandidateWatchingSpotCount: boolean;
  showCandidateWatchingSpotDetails: boolean;
};

const DEFAULT_GROUND_AREA_RADIUS_NM = 3;

const AIRPORT_MAP_ZOOM_FEATURE_DEFAULTS: AirportMapZoomFeatures = Object.freeze({
  airportGroundTrafficHideRadiusNm: null,
  showAirportAreaCount: false,
  showNearbyAirportRunways: false,
  showRangeRingLabels: false,
  showRunwayEndLabels: false,
  showCandidateWatchingSpotCount: false,
  showCandidateWatchingSpotDetails: false,
});

const AIRPORT_MAP_ZOOM_FEATURES_BY_LEVEL: Record<number, AirportMapZoomFeatures> = Object.freeze({
  [ZOOM_APPROACH]: Object.freeze({
    airportGroundTrafficHideRadiusNm: DEFAULT_GROUND_AREA_RADIUS_NM,
    showAirportAreaCount: true,
    showNearbyAirportRunways: true,
    showRangeRingLabels: false,
    showRunwayEndLabels: false,
    showCandidateWatchingSpotCount: true,
    showCandidateWatchingSpotDetails: false,
  }),
  [ZOOM_AIRPORT]: Object.freeze({
    airportGroundTrafficHideRadiusNm: 0.5,
    showAirportAreaCount: true,
    showNearbyAirportRunways: true,
    showRangeRingLabels: true,
    showRunwayEndLabels: false,
    showCandidateWatchingSpotCount: true,
    showCandidateWatchingSpotDetails: false,
  }),
  [ZOOM_DETAIL]: Object.freeze({
    airportGroundTrafficHideRadiusNm: null,
    showAirportAreaCount: false,
    showNearbyAirportRunways: true,
    showRangeRingLabels: true,
    showRunwayEndLabels: true,
    showCandidateWatchingSpotCount: false,
    showCandidateWatchingSpotDetails: true,
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

export const shouldShowCandidateWatchingSpotCountForZoom = (zoom: unknown) =>
  airportMapZoomFeaturesFor(zoom).showCandidateWatchingSpotCount;

export const shouldShowCandidateWatchingSpotDetailsForZoom = (zoom: unknown) =>
  airportMapZoomFeaturesFor(zoom).showCandidateWatchingSpotDetails;
