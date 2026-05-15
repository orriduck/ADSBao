export const TRAFFIC_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "routed", label: "Routes only" },
];

export const ALTITUDE_LEVEL_OPTIONS = [
  { value: "all", label: "Any" },
  { value: "ground", label: "Ground" },
  { value: "climb-descent", label: "Climb / descent" },
  { value: "high", label: "High" },
];

export const DEFAULT_AIRCRAFT_FILTERS = Object.freeze({
  trafficFilter: "all",
  typeFilter: "all",
  altitudeLevel: "all",
});

export function aircraftTypeLabel(aircraft = {}) {
  return String(aircraft.type || aircraft.category || "").trim();
}

export function getAircraftTypes(aircraft = []) {
  return [...new Set(aircraft.map(aircraftTypeLabel).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b),
  );
}

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export function matchesTrafficFilter(aircraft, trafficFilter) {
  if (trafficFilter === "routed") {
    return Boolean(aircraft.flightRouteLabel || aircraft.flightRoute);
  }
  return true;
}

export function matchesTypeFilter(aircraft, typeFilter) {
  if (typeFilter === "all") return true;
  return aircraftTypeLabel(aircraft) === typeFilter;
}

export function matchesAltitudeLevel(aircraft, altitudeLevel) {
  if (altitudeLevel === "all") return true;
  const altitude = aircraft.onGround ? 0 : toNumber(aircraft.altitude);
  if (altitudeLevel === "ground") return altitude == null || altitude < 100;
  if (altitude == null) return false;
  if (altitudeLevel === "climb-descent") {
    return altitude >= 100 && altitude < 12000;
  }
  if (altitudeLevel === "high") return altitude >= 12000;
  return true;
}

export function aircraftMatchesFilters(
  aircraft,
  { trafficFilter = "all", typeFilter = "all", altitudeLevel = "all" } = {},
) {
  return (
    matchesTrafficFilter(aircraft, trafficFilter) &&
    matchesTypeFilter(aircraft, typeFilter) &&
    matchesAltitudeLevel(aircraft, altitudeLevel)
  );
}
