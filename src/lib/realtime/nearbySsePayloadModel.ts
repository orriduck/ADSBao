type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasNonEmptyRecord(value: unknown) {
  return isRecord(value) && Object.keys(value).length > 0;
}

function hasFocalAircraftIdentity(value: unknown) {
  if (!isRecord(value)) return false;
  const callsign = String(value.callsign || "").trim();
  const hex = String(value.hex || value.icao24 || "").trim();
  if (callsign || hex) return true;
  return Number.isFinite(Number(value.lat)) && Number.isFinite(Number(value.lon));
}

/** The existing traffic contract is an array or an object containing `ac`. */
export function hasAircraftPayload(value: unknown) {
  return (
    Array.isArray(value) ||
    (isRecord(value) && Array.isArray(value.ac))
  );
}

export function hasNearbyAircraftPayload(data: unknown) {
  return isRecord(data) && hasAircraftPayload(data.aircraft);
}

/** A callsign stream cannot be considered ready until it has a focal record. */
export function hasNearbyFocusPayload(data: unknown) {
  if (!isRecord(data)) return false;
  const focus = data.focus;
  if (Array.isArray(focus)) return focus.some(hasFocalAircraftIdentity);
  if (!isRecord(focus)) return false;
  if (Array.isArray(focus.ac)) return focus.ac.some(hasFocalAircraftIdentity);
  return hasNonEmptyRecord(focus) && hasFocalAircraftIdentity(focus);
}

export function hasNearbyStreamPayload(data: unknown) {
  return hasNearbyAircraftPayload(data) || hasNearbyFocusPayload(data);
}

/** `undefined` means the frame intentionally omitted the static airport list. */
export function readNearbyAirportsUpdate(data: unknown): unknown[] | undefined {
  if (!isRecord(data) || !Object.hasOwn(data, "nearbyAirports")) return undefined;
  return Array.isArray(data.nearbyAirports) ? data.nearbyAirports : undefined;
}
