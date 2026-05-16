// Convert raw CSV records from OurAirports into rows ready for Supabase
// upsert. All numeric fields are coerced via toFiniteNumber; blank strings
// become empty-string defaults to match the migration's `not null default ''`
// columns; identifiers are uppercased for stable lookup.

import { toFiniteNumber } from "../../../utils/math.js";

const trim = (value) => String(value ?? "").trim();
const upper = (value) => trim(value).toUpperCase();
const numberOrNull = (value) => {
  const trimmed = trim(value);
  if (trimmed === "") return null;
  const parsed = toFiniteNumber(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};
const intOrNull = (value) => {
  const parsed = numberOrNull(value);
  if (parsed === null) return null;
  return Math.trunc(parsed);
};
const boolFromZeroOne = (value) => {
  const trimmed = trim(value);
  if (trimmed === "1" || trimmed.toLowerCase() === "true") return true;
  return false;
};
const boolFromYesNo = (value) => {
  const trimmed = trim(value).toLowerCase();
  return trimmed === "yes" || trimmed === "true" || trimmed === "1";
};

export const normalizeAirportRow = (record) => {
  const ident = upper(record?.ident);
  if (!ident) return null;

  return {
    ident,
    ourairports_id: intOrNull(record?.id),
    type: trim(record?.type),
    name: trim(record?.name),
    latitude_deg: numberOrNull(record?.latitude_deg),
    longitude_deg: numberOrNull(record?.longitude_deg),
    elevation_ft: numberOrNull(record?.elevation_ft),
    continent: upper(record?.continent),
    iso_country: upper(record?.iso_country),
    iso_region: upper(record?.iso_region),
    municipality: trim(record?.municipality),
    scheduled_service: boolFromYesNo(record?.scheduled_service),
    icao_code: upper(record?.icao_code),
    iata_code: upper(record?.iata_code),
    gps_code: upper(record?.gps_code),
    local_code: upper(record?.local_code),
    home_link: trim(record?.home_link),
    wikipedia_link: trim(record?.wikipedia_link),
    keywords: trim(record?.keywords),
  };
};

export const normalizeRunwayRow = (record) => {
  const id = intOrNull(record?.id);
  const airportIdent = upper(record?.airport_ident);
  if (id === null || !airportIdent) return null;

  return {
    id,
    airport_ref: intOrNull(record?.airport_ref),
    airport_ident: airportIdent,
    length_ft: numberOrNull(record?.length_ft),
    width_ft: numberOrNull(record?.width_ft),
    surface: trim(record?.surface),
    lighted: boolFromZeroOne(record?.lighted),
    closed: boolFromZeroOne(record?.closed),
    le_ident: upper(record?.le_ident),
    le_latitude_deg: numberOrNull(record?.le_latitude_deg),
    le_longitude_deg: numberOrNull(record?.le_longitude_deg),
    le_elevation_ft: numberOrNull(record?.le_elevation_ft),
    le_heading_deg_t: numberOrNull(record?.le_heading_degT),
    le_displaced_threshold_ft: numberOrNull(record?.le_displaced_threshold_ft),
    he_ident: upper(record?.he_ident),
    he_latitude_deg: numberOrNull(record?.he_latitude_deg),
    he_longitude_deg: numberOrNull(record?.he_longitude_deg),
    he_elevation_ft: numberOrNull(record?.he_elevation_ft),
    he_heading_deg_t: numberOrNull(record?.he_heading_degT),
    he_displaced_threshold_ft: numberOrNull(record?.he_displaced_threshold_ft),
  };
};

export const normalizeFrequencyRow = (record) => {
  const id = intOrNull(record?.id);
  const airportIdent = upper(record?.airport_ident);
  if (id === null || !airportIdent) return null;

  return {
    id,
    airport_ref: intOrNull(record?.airport_ref),
    airport_ident: airportIdent,
    type: trim(record?.type),
    description: trim(record?.description),
    frequency_mhz: numberOrNull(record?.frequency_mhz),
  };
};

export const normalizeNavaidRow = (record) => {
  const id = intOrNull(record?.id);
  if (id === null) return null;

  return {
    id,
    filename: trim(record?.filename),
    ident: upper(record?.ident),
    name: trim(record?.name),
    type: trim(record?.type),
    frequency_khz: numberOrNull(record?.frequency_khz),
    latitude_deg: numberOrNull(record?.latitude_deg),
    longitude_deg: numberOrNull(record?.longitude_deg),
    elevation_ft: numberOrNull(record?.elevation_ft),
    iso_country: upper(record?.iso_country),
    dme_frequency_khz: numberOrNull(record?.dme_frequency_khz),
    dme_channel: trim(record?.dme_channel),
    dme_latitude_deg: numberOrNull(record?.dme_latitude_deg),
    dme_longitude_deg: numberOrNull(record?.dme_longitude_deg),
    dme_elevation_ft: numberOrNull(record?.dme_elevation_ft),
    slaved_variation_deg: numberOrNull(record?.slaved_variation_deg),
    magnetic_variation_deg: numberOrNull(record?.magnetic_variation_deg),
    usage_type: trim(record?.usageType),
    power: trim(record?.power),
    associated_airport: upper(record?.associated_airport),
  };
};

export const normalizeAirports = (records) =>
  records.map(normalizeAirportRow).filter(Boolean);

export const normalizeRunways = (records) =>
  records.map(normalizeRunwayRow).filter(Boolean);

export const normalizeFrequencies = (records) =>
  records.map(normalizeFrequencyRow).filter(Boolean);

export const normalizeNavaids = (records) =>
  records.map(normalizeNavaidRow).filter(Boolean);
