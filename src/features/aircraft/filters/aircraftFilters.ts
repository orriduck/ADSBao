// Visible labels are i18n keys, not literal strings — the Select renders
// option.labelKey through t(...) so the dropdown switches with the locale.
// `label` is kept as a default English fallback for any consumer that
// reads it directly.
import { resolveAircraftDisplayModel } from "../aircraftTypeDisplayModel";

export const ALTITUDE_LEVEL_OPTIONS = [
  { value: "all", labelKey: "filters.altAny", label: "Any" },
  { value: "ground", labelKey: "filters.altGround", label: "Ground" },
  {
    value: "climb-descent",
    labelKey: "filters.altClimbDescent",
    label: "Climb / descent",
  },
  { value: "high", labelKey: "filters.altHigh", label: "High" },
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
  { value: "all", labelKey: "sidebar.all", label: "All" },
  { value: "aircraft", labelKey: "filters.entityAircraft", label: "Aircraft" },
  { value: "airports", labelKey: "filters.entityAirports", label: "Airports" },
];

const ENTITY_FILTER_CYCLE = ["all", "aircraft", "airports"];

export function getNextEntityFilter(value) {
  const index = ENTITY_FILTER_CYCLE.indexOf(value);
  if (index < 0) return "all";
  return ENTITY_FILTER_CYCLE[(index + 1) % ENTITY_FILTER_CYCLE.length];
}

// ADS-B emitter / wake-class categories. A1–A7 map to specific labels; anything
// outside (B*, C*, A0, blank) collapses into a single "Other" bucket so the
// grouped dropdown never gets cluttered with one-off codes. Labels carry the
// i18n key so the dropdown can localize at render time.
const CATEGORY_LABELS = Object.freeze({
  A1: { key: "filters.categoryA1", default: "Lightweight aircraft" },
  A2: { key: "filters.categoryA2", default: "Small aircraft" },
  A3: { key: "filters.categoryA3", default: "Large aircraft" },
  A4: { key: "filters.categoryA4", default: "High-vortex aircraft" },
  A5: { key: "filters.categoryA5", default: "Heavy aircraft" },
  A6: { key: "filters.categoryA6", default: "High-performance aircraft" },
  A7: { key: "filters.categoryA7", default: "Rotorcraft" },
});

const CATEGORY_ORDER = ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "OTHER"];
const OTHER_LABEL = { key: "filters.categoryOther", default: "Other" };
const UNCLASSIFIED_TYPE_LABEL = "All Unclassified";

type AircraftFilterRecord = {
  type?: unknown;
  category?: unknown;
  flightRouteLabel?: unknown;
  movement?: unknown;
  trafficIntent?: unknown;
  onGround?: boolean;
  altitude?: unknown;
  [key: string]: unknown;
};

type AircraftFilterOptions = {
  trafficFilter?: string;
  typeFilter?: string | string[];
  altitudeLevel?: string;
  movementFilter?: string;
};

export function aircraftTypeLabel(aircraft: AircraftFilterRecord = {}) {
  const display = resolveAircraftDisplayModel(aircraft);
  return display.icaoType || display.category;
}

function getAircraftCategoryCode(aircraft: AircraftFilterRecord = {}) {
  const raw = String(aircraft.category || "").trim().toUpperCase();
  return CATEGORY_LABELS[raw] ? raw : "OTHER";
}

function getCategoryLabel(categoryCode: string) {
  return (CATEGORY_LABELS[categoryCode] || OTHER_LABEL).default;
}

function getCategoryLabelKey(categoryCode: string) {
  return (CATEGORY_LABELS[categoryCode] || OTHER_LABEL).key;
}

function getAircraftTypeFilterLabel(display: ReturnType<typeof resolveAircraftDisplayModel>) {
  return display.icaoType ? display.displayName : UNCLASSIFIED_TYPE_LABEL;
}

// Build [{ category, label, types: [...] }] from the current aircraft set,
// grouping each ICAO type code under its first-seen ADS-B category. Only
// categories that have at least one type are included. `extraTypes` is merged
// in (assigned to "Other") so currently-selected types whose category isn't
// representable from live data still appear in the dropdown.
export function getAircraftTypeGroups(
  aircraft: AircraftFilterRecord[] = [],
  extraTypes: string[] = [],
) {
  const typeToEntry = new Map();
  for (const item of aircraft) {
    const type = aircraftTypeLabel(item);
    if (!type) continue;
    if (typeToEntry.has(type)) continue;
    const display = resolveAircraftDisplayModel(item);
    const label = getAircraftTypeFilterLabel(display);
    typeToEntry.set(type, {
      category: getAircraftCategoryCode(item),
      item: {
        value: type,
        label,
        shortLabel: display.icaoType ? display.shortName : label,
        icaoType: display.icaoType,
      },
    });
  }
  for (const type of extraTypes) {
    const value = String(type || "").trim().toUpperCase();
    if (value && !typeToEntry.has(value)) {
      const display = resolveAircraftDisplayModel({ type: value });
      typeToEntry.set(value, {
        category: "OTHER",
        item: {
          value,
          label: display.displayName,
          shortLabel: display.shortName,
          icaoType: display.icaoType,
        },
      });
    }
  }

  const buckets = new Map(CATEGORY_ORDER.map((code) => [code, new Set()]));
  for (const entry of typeToEntry.values()) {
    buckets.get(entry.category).add(entry.item);
  }

  return CATEGORY_ORDER.map((category) => ({
    category,
    label: getCategoryLabel(category),
    labelKey: getCategoryLabelKey(category),
    types: [...buckets.get(category)].sort((a: any, b: any) =>
      String(a.label).localeCompare(String(b.label)),
    ),
  })).filter((group) => group.types.length > 0);
}

const toNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

function matchesTrafficFilter(aircraft: AircraftFilterRecord, trafficFilter: string) {
  if (trafficFilter === "routed") {
    // flightRouteLabel is non-empty only when the route lookup resolved a
    // distinct origin AND destination — i.e., a legitimately parsed route.
    return Boolean(aircraft.flightRouteLabel);
  }
  return true;
}

function matchesMovementFilter(aircraft: AircraftFilterRecord, movementFilter: string) {
  if (movementFilter === "departures") return aircraft?.movement === "DEPARTURE";
  if (movementFilter === "arrivals") return aircraft?.movement === "ARRIVAL";
  return true;
}

function matchesTypeFilter(aircraft: AircraftFilterRecord, typeFilter: string | string[]) {
  if (typeFilter === "all" || !typeFilter) return true;
  if (Array.isArray(typeFilter)) {
    if (typeFilter.length === 0) return true;
    return typeFilter.includes(aircraftTypeLabel(aircraft));
  }
  return aircraftTypeLabel(aircraft) === typeFilter;
}

function matchesAltitudeLevel(aircraft: AircraftFilterRecord, altitudeLevel: string) {
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
  aircraft: AircraftFilterRecord,
  {
    trafficFilter = "all",
    typeFilter = "all",
    altitudeLevel = "all",
    movementFilter = "all",
  }: AircraftFilterOptions = {},
) {
  return (
    matchesTrafficFilter(aircraft, trafficFilter) &&
    matchesMovementFilter(aircraft, movementFilter) &&
    matchesTypeFilter(aircraft, typeFilter) &&
    matchesAltitudeLevel(aircraft, altitudeLevel)
  );
}
