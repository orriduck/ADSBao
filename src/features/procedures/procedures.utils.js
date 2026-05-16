export const normalizeProcedureCountry = (country) =>
  String(country || "").toUpperCase();

export const normalizeProcedureIcao = (icao) =>
  String(icao || "").toUpperCase();

export const isSupportedFaaProcedureAirport = ({ country, icao }) =>
  country === "US" && /^K[A-Z0-9]{3}$/.test(icao);
