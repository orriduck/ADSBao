const normalizeAirport = (airport) => {
  if (!airport) return null;
  const lat = Number(airport.latitude);
  const lon = Number(airport.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return {
    icao: String(airport.icao_code || "")
      .trim()
      .toUpperCase(),
    iata: String(airport.iata_code || "")
      .trim()
      .toUpperCase(),
    name: String(airport.name || "").trim(),
    municipality: String(airport.municipality || "").trim(),
    country: String(airport.country_name || "").trim(),
    lat,
    lon,
  };
};

export const normalizeFlightRoute = (payload) => {
  const route = payload?.response?.flightroute;
  if (!route) return null;

  const origin = normalizeAirport(route.origin);
  const destination = normalizeAirport(route.destination);
  if (!origin || !destination || !origin.icao || !destination.icao) return null;

  const callsign = String(route.callsign || route.callsign_icao || "")
    .trim()
    .toUpperCase();
  if (!callsign) return null;

  return {
    callsign,
    callsignIcao: String(route.callsign_icao || "")
      .trim()
      .toUpperCase(),
    callsignIata: String(route.callsign_iata || "")
      .trim()
      .toUpperCase(),
    airlineName: String(route.airline?.name || "").trim(),
    airlineIcao: String(route.airline?.icao || "")
      .trim()
      .toUpperCase(),
    airlineIata: String(route.airline?.iata || "")
      .trim()
      .toUpperCase(),
    airlineIconUrl: String(route.airline?.icon_url || route.airline?.iconUrl || "")
      .trim(),
    origin,
    destination,
    source: "flightaware",
  };
};
