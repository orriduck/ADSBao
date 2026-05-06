import { AIRCRAFT_COLORS } from "../constants/aircraft.js";

export const AIRPORT_MAP_FALLBACK_CENTER = {
  lat: 33.9416,
  lon: -118.4085,
};

export const AIRPORT_AREA_RADIUS_NM = 2.2;

export const AIRPORT_MAP_TRAFFIC_LEGEND = [
  { id: "departure", label: "DEP", color: AIRCRAFT_COLORS.departure },
  { id: "unknown", label: "UNKN", color: AIRCRAFT_COLORS.unknown },
  { id: "arrival", label: "ARR", color: AIRCRAFT_COLORS.arrival },
];
