import { toFiniteNumber } from "../../../utils/math";

import {
  NEARBY_AIRPORT_DEFAULTS,
  NEARBY_AIRPORT_LIMITS,
} from "./nearbyAirports.models";

type NearbyAirportQueryRecord = Record<string, any>;

export const readNearbyAirportNumber = (searchParams: URLSearchParams, key: string) => {
  const raw = searchParams.get(key);
  return raw == null || raw === "" ? null : toFiniteNumber(raw);
};

export const normalizeNearbyAirportQuery = ({
  lat,
  lon,
  icao,
  radiusNm,
  limit,
}: NearbyAirportQueryRecord = {}) => ({
  lat,
  lon,
  icao: String(icao || "").trim().toUpperCase(),
  radiusNm: radiusNm || NEARBY_AIRPORT_DEFAULTS.radiusNm,
  limit: limit || NEARBY_AIRPORT_DEFAULTS.limit,
});

export const isValidNearbyAirportQuery = ({
  lat,
  lon,
  icao,
  radiusNm,
  limit,
}: NearbyAirportQueryRecord = {}) => {
  const limits = NEARBY_AIRPORT_LIMITS;
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    radiusNm >= limits.minRadiusNm &&
    radiusNm <= limits.maxRadiusNm &&
    limit >= limits.minLimit &&
    limit <= limits.maxLimit &&
    (!icao || /^[A-Z0-9]{3,4}$/.test(icao))
  );
};
