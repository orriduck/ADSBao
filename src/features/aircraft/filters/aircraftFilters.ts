// Visible labels are i18n keys, not literal strings — the Select renders
// option.labelKey through t(...) so the dropdown switches with the locale.
// `label` is kept as a default English fallback for any consumer that
// reads it directly.
import { resolveAircraftDisplayModel } from "../aircraftTypeDisplayModel";

export const ALTITUDE_LEVEL_OPTIONS = [
  {
    value: "below-3000",
    labelKey: "filters.altBelow3000",
    label: "Below 3,000 ft",
  },
  {
    value: "3000-10000",
    labelKey: "filters.alt3000To10000",
    label: "3,000-10,000 ft",
  },
  {
    value: "10000-20000",
    labelKey: "filters.alt10000To20000",
    label: "10,000-20,000 ft",
  },
  {
    value: "above-20000",
    labelKey: "filters.altAbove20000",
    label: "Above 20,000 ft",
  },
];

export const ALTITUDE_LEVEL_VALUES = Object.freeze(
  ALTITUDE_LEVEL_OPTIONS.map((option) => option.value),
);

export const DEFAULT_ALTITUDE_LEVELS = Object.freeze([
  "below-3000",
  "3000-10000",
]);

const LEGACY_ALTITUDE_LEVELS = Object.freeze({
  all: ALTITUDE_LEVEL_VALUES,
  ground: ["below-3000"],
  "climb-descent": ["3000-10000", "10000-20000"],
  high: ["10000-20000", "above-20000"],
});

export const DEFAULT_AIRCRAFT_FILTERS = Object.freeze({
  trafficFilter: "all",
  typeFilter: "all",
  altitudeLevel: DEFAULT_ALTITUDE_LEVELS,
  // What kind of entities to show in the list:
  //   "all"      — aircraft + nearby airports
  //   "airports" — nearby airports only
  //   "aircraft" — aircraft only
  // Default to aircraft-only: the nearby list is primarily a traffic list, and
  // dropping airports from the default cut keeps the list shorter and lighter.
  entityFilter: "aircraft",
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
  altitudeLevel?: string | readonly string[];
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
    const display = resolveAircraftDisplayModel(item);
    const type = display.icaoType || display.category;
    if (!type) continue;
    if (typeToEntry.has(type)) continue;
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

export function normalizeAltitudeLevelSelection(
  altitudeLevel: unknown = DEFAULT_ALTITUDE_LEVELS,
) {
  if (altitudeLevel == null) return [...DEFAULT_ALTITUDE_LEVELS];

  const rawValues = Array.isArray(altitudeLevel) ? altitudeLevel : [altitudeLevel];
  if (rawValues.length === 0) return [...ALTITUDE_LEVEL_VALUES];

  const next = [];
  for (const rawValue of rawValues) {
    const value = String(rawValue || "").trim();
    if (!value) continue;
    const legacy = LEGACY_ALTITUDE_LEVELS[value];
    if (legacy) {
      if (value === "all") return [...ALTITUDE_LEVEL_VALUES];
      next.push(...legacy);
      continue;
    }
    if (ALTITUDE_LEVEL_VALUES.includes(value)) {
      next.push(value);
    }
  }

  return next.length > 0
    ? Array.from(new Set(next))
    : [...DEFAULT_ALTITUDE_LEVELS];
}

export function isAltitudeSelectionAll(altitudeLevel: unknown) {
  const selected = normalizeAltitudeLevelSelection(altitudeLevel);
  return ALTITUDE_LEVEL_VALUES.every((value) => selected.includes(value));
}

function matchesAltitudeBand(aircraft: AircraftFilterRecord, altitudeLevel: string) {
  const altitude = aircraft.onGround ? 0 : toNumber(aircraft.altitude);
  if (altitudeLevel === "below-3000") return altitude == null || altitude < 3000;
  if (altitude == null) return false;
  if (altitudeLevel === "3000-10000") return altitude >= 3000 && altitude < 10000;
  if (altitudeLevel === "10000-20000") return altitude >= 10000 && altitude < 20000;
  if (altitudeLevel === "above-20000") return altitude >= 20000;
  return true;
}

function matchesAltitudeLevel(
  aircraft: AircraftFilterRecord,
  altitudeLevel: string | readonly string[],
) {
  const selectedAltitudeLevels = normalizeAltitudeLevelSelection(altitudeLevel);
  if (isAltitudeSelectionAll(selectedAltitudeLevels)) return true;
  return selectedAltitudeLevels.some((level) => matchesAltitudeBand(aircraft, level));
}

export function aircraftMatchesFilters(
  aircraft: AircraftFilterRecord,
  {
    trafficFilter = "all",
    typeFilter = "all",
    altitudeLevel = DEFAULT_ALTITUDE_LEVELS,
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
