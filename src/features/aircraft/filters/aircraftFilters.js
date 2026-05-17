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
  // What kind of entities to show in the list:
  //   "all"      — aircraft + nearby airports
  //   "airports" — nearby airports only
  //   "aircraft" — aircraft only
  entityFilter: "all",
});

export const ENTITY_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "aircraft", label: "Aircraft" },
  { value: "airports", label: "Airports" },
];

// ADS-B emitter / wake-class categories. A1–A7 map to specific labels; anything
// outside (B*, C*, A0, blank) collapses into a single "Other" bucket so the
// grouped dropdown never gets cluttered with one-off codes.
const CATEGORY_LABELS = Object.freeze({
  A1: "Light",
  A2: "Small",
  A3: "Large",
  A4: "High-vortex",
  A5: "Heavy",
  A6: "High-performance",
  A7: "Rotorcraft",
});

const CATEGORY_ORDER = ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "OTHER"];
const OTHER_LABEL = "Other";

export function aircraftTypeLabel(aircraft = {}) {
  return String(aircraft.type || aircraft.category || "").trim();
}

export function getAircraftCategoryCode(aircraft = {}) {
  const raw = String(aircraft.category || "").trim().toUpperCase();
  return CATEGORY_LABELS[raw] ? raw : "OTHER";
}

export function getCategoryLabel(categoryCode) {
  return CATEGORY_LABELS[categoryCode] || OTHER_LABEL;
}

export function getAircraftTypes(aircraft = []) {
  return [...new Set(aircraft.map(aircraftTypeLabel).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b),
  );
}

// Build [{ category, label, types: [...] }] from the current aircraft set,
// grouping each ICAO type code under its first-seen ADS-B category. Only
// categories that have at least one type are included. `extraTypes` is merged
// in (assigned to "Other") so currently-selected types whose category isn't
// representable from live data still appear in the dropdown.
export function getAircraftTypeGroups(aircraft = [], extraTypes = []) {
  const typeToCategory = new Map();
  for (const item of aircraft) {
    const type = aircraftTypeLabel(item);
    if (!type) continue;
    if (typeToCategory.has(type)) continue;
    typeToCategory.set(type, getAircraftCategoryCode(item));
  }
  for (const type of extraTypes) {
    if (type && !typeToCategory.has(type)) {
      typeToCategory.set(type, "OTHER");
    }
  }

  const buckets = new Map(CATEGORY_ORDER.map((code) => [code, new Set()]));
  for (const [type, category] of typeToCategory) {
    buckets.get(category).add(type);
  }

  return CATEGORY_ORDER.map((category) => ({
    category,
    label: getCategoryLabel(category),
    types: [...buckets.get(category)].sort((a, b) => a.localeCompare(b)),
  })).filter((group) => group.types.length > 0);
}

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export function matchesTrafficFilter(aircraft, trafficFilter) {
  if (trafficFilter === "routed") {
    // flightRouteLabel is non-empty only when the route lookup resolved a
    // distinct origin AND destination — i.e., a legitimately parsed route.
    return Boolean(aircraft.flightRouteLabel);
  }
  return true;
}

export function matchesTypeFilter(aircraft, typeFilter) {
  if (typeFilter === "all" || !typeFilter) return true;
  if (Array.isArray(typeFilter)) {
    if (typeFilter.length === 0) return true;
    return typeFilter.includes(aircraftTypeLabel(aircraft));
  }
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
