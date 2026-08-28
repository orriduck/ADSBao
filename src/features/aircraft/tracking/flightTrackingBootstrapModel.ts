import { normalizeCallsign } from "@/utils/callsign";

type NavigationAircraft = Record<string, unknown> & {
  callsign?: unknown;
  lat?: unknown;
  lon?: unknown;
};

function validCoordinate(value: unknown, min: number, max: number) {
  if (value == null || typeof value === "boolean" || String(value).trim() === "") {
    return false;
  }
  const coordinate = Number(value);
  return Number.isFinite(coordinate) && coordinate >= min && coordinate <= max;
}

export function resolveTrackedFlightBootstrapAircraft({
  callsign,
  navigationAircraft,
}: {
  callsign: unknown;
  navigationAircraft: NavigationAircraft | null | undefined;
}) {
  if (!navigationAircraft) return null;
  if (
    normalizeCallsign(navigationAircraft.callsign) !== normalizeCallsign(callsign) ||
    !validCoordinate(navigationAircraft.lat, -90, 90) ||
    !validCoordinate(navigationAircraft.lon, -180, 180)
  ) {
    return null;
  }
  return navigationAircraft;
}

export function resolveTrackedFlightBootstrapNearbyAircraft({
  callsign,
  navigationAircraft,
  navigationNearbyAircraft,
}: {
  callsign: unknown;
  navigationAircraft: NavigationAircraft | null | undefined;
  navigationNearbyAircraft: unknown;
}) {
  if (
    !resolveTrackedFlightBootstrapAircraft({ callsign, navigationAircraft }) ||
    !Array.isArray(navigationNearbyAircraft)
  ) {
    return [];
  }
  return navigationNearbyAircraft.filter((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
    const aircraft = entry as NavigationAircraft;
    return validCoordinate(aircraft.lat, -90, 90) && validCoordinate(aircraft.lon, -180, 180);
  });
}
