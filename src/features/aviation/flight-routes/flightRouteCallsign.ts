// Shared callsign normalization for route lookup. The HTTP-facing layers
// (route handlers, upstream clients) need a single contract for what counts
// as a "callable" callsign so the proxy, Supabase override lookup, and the
// adsbdb client all agree on the same value.
export function normalizeRouteCallsign(rawCallsign) {
  const callsign = String(rawCallsign || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  if (!callsign || callsign.length < 3 || !/^[A-Z][A-Z0-9]{2,7}$/.test(callsign)) {
    return "";
  }
  return callsign;
}

export function sanitizeAirportCode(value, { min = 3, max = 4 } = {}) {
  const code = String(value || "").trim().toUpperCase();
  return new RegExp(`^[A-Z0-9]{${min},${max}}$`).test(code) ? code : "";
}
