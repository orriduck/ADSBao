export const getTargetAirportFromSearchParams = (searchParams) => ({
  icao: searchParams?.get("airportIcao") || searchParams?.get("airport") || "",
  iata: searchParams?.get("airportIata") || "",
});

export const shouldForceAerodatabox = (searchParams) =>
  searchParams?.get("force") === "aerodatabox";

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
