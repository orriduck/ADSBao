export const getTargetAirportFromSearchParams = (searchParams) => ({
  icao: searchParams?.get("airportIcao") || searchParams?.get("airport") || "",
  iata: searchParams?.get("airportIata") || "",
});

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
