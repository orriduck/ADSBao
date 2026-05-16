import {
  AIRPORT_DETAIL_LIMITS,
  AIRPORT_SEARCH_LIMITS,
} from "./airportDirectory.models.js";

export const normalizeAirportSearchLimit = (value) => {
  const limitRaw = value == null || value === "" ? NaN : Number(value);
  return Number.isFinite(limitRaw)
    ? Math.max(1, Math.min(limitRaw, AIRPORT_SEARCH_LIMITS.maxLimit))
    : AIRPORT_SEARCH_LIMITS.defaultLimit;
};

export const normalizeAirportSearchCountry = (value) =>
  String(value || "").trim().toUpperCase();

export const normalizeAirportSearchType = (value) =>
  String(value || "").trim();

export const normalizeAirportSearchQuery = (value) =>
  String(value || "").trim();

export const isValidAirportSearchCountry = (country) =>
  !country || /^[A-Z]{2}$/.test(country);

export const normalizeAirportIdent = (value) =>
  String(value || "").trim().toUpperCase();

export const isValidAirportIdent = (ident) => /^[A-Z0-9]{2,7}$/.test(ident);

export const normalizeOptionalAirportInt = (value, { max }) => {
  if (value == null || value === "") return undefined;
  const number = Number(value);
  if (!Number.isFinite(number)) return undefined;
  return Math.max(1, Math.min(number, max));
};

export const normalizeAirportDetailOptions = ({
  nearbyRadiusNm,
  nearbyLimit,
} = {}) => ({
  radiusNm: normalizeOptionalAirportInt(nearbyRadiusNm, {
    max: AIRPORT_DETAIL_LIMITS.maxNearbyRadiusNm,
  }),
  nearbyLimit: normalizeOptionalAirportInt(nearbyLimit, {
    max: AIRPORT_DETAIL_LIMITS.maxNearbyLimit,
  }),
});
