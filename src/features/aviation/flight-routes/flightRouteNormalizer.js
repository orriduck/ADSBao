const normalizeAirport = (airport) => {
  if (!airport) return null;
  const lat = Number(airport.lat);
  const lon = Number(airport.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return {
    icao: String(airport.icao || "")
      .trim()
      .toUpperCase(),
    iata: String(airport.iata || "")
      .trim()
      .toUpperCase(),
    name: String(airport.name || "").trim(),
    municipality: String(airport.municipality || "").trim(),
    country: String(airport.country || "").trim(),
    lat,
    lon,
  };
};

export const normalizeFlightRoute = (payload) => {
  const route = payload && typeof payload === "object" ? payload : null;
  if (!route) return null;

  const origin = normalizeAirport(route.origin);
  const destination = normalizeAirport(route.destination);
  if (!origin || !destination || !origin.icao || !destination.icao) return null;

  const callsign = String(route.callsign || route.callsign_icao || "")
    .trim()
    .toUpperCase();
  if (!callsign) return null;
  const number = String(route.number || "").trim();
  const airlineIata = String(route.airline?.iata || "")
    .trim()
    .toUpperCase();
  const airlineIcao = String(route.airline?.icao || "")
    .trim()
    .toUpperCase();

  return {
    callsign,
    callsignIcao: callsign,
    callsignIata: airlineIata && number ? `${airlineIata}${number}` : "",
    airlineName: String(route.airline?.name || "").trim(),
    airlineIcao,
    airlineIata,
    airlineIconUrl: String(route.airline?.iconUrl || "")
      .trim(),
    origin,
    destination,
    route: route.route || null,
    airports: Array.isArray(route.airports) ? route.airports : [],
    source: route.source || "vrs-standing-data",
    confidence: route.confidence || "",
  };
};
