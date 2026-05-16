import { toFiniteNumber } from "../../../utils/math.js";

import {
  NEARBY_AIRPORT_DEFAULTS,
  NEARBY_AIRPORT_LIMITS,
} from "./nearbyAirports.models.js";

export const readNearbyAirportNumber = (searchParams, key) => {
  const raw = searchParams.get(key);
  return raw == null || raw === "" ? null : toFiniteNumber(raw);
};

export const normalizeNearbyAirportQuery = ({
  lat,
  lon,
  icao,
  radiusNm,
  limit,
  country,
  minRunwayLength,
} = {}) => ({
  lat,
  lon,
  icao: String(icao || "").trim().toUpperCase(),
  radiusNm: radiusNm || NEARBY_AIRPORT_DEFAULTS.radiusNm,
  limit: limit || NEARBY_AIRPORT_DEFAULTS.limit,
  country: String(country || NEARBY_AIRPORT_DEFAULTS.country)
    .trim()
    .toUpperCase(),
  minRunwayLength:
    minRunwayLength || NEARBY_AIRPORT_DEFAULTS.minRunwayLength,
});

export const isValidNearbyAirportQuery = ({
  lat,
  lon,
  icao,
  radiusNm,
  limit,
  country,
  minRunwayLength,
} = {}) => {
  const limits = NEARBY_AIRPORT_LIMITS;
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    radiusNm >= limits.minRadiusNm &&
    radiusNm <= limits.maxRadiusNm &&
    limit >= limits.minLimit &&
    limit <= limits.maxLimit &&
    minRunwayLength >= limits.minRunwayLength &&
    minRunwayLength <= limits.maxRunwayLength &&
    /^[A-Z]{2}$/.test(country) &&
    (!icao || /^[A-Z0-9]{3,4}$/.test(icao))
  );
};
