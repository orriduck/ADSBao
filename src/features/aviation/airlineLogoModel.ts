const unavailableAirlineLogoUrls = new Set();

export function getFlightRouteAirlineIconUrl(route) {
  const code = String(route?.airlineIcao || route?.airline?.icao || "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{2,3}$/.test(code)) return "";

  const url = `/api/proxy/airlines/${code}`;
  return unavailableAirlineLogoUrls.has(url) ? "" : url;
}

export function markAirlineLogoUnavailable(src) {
  const url = String(src || "").trim();
  if (url) unavailableAirlineLogoUrls.add(url);
}

export function isAirlineLogoUnavailable(src) {
  return unavailableAirlineLogoUrls.has(String(src || "").trim());
}
