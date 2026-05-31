export const normalizeCallsign = (callsign) =>
  String(callsign || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

export const isLookupCallsign = (callsign) =>
  /^[A-Z0-9]{2,8}$/.test(normalizeCallsign(callsign));
