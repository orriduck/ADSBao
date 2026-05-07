export const AIRPORT_CONTEXT_GROUP_ORDER = [
  "Airport Area",
  "Terminal Flow",
  "High / Passing Over",
  "Unknown",
];

export const DEFAULT_ALTITUDE_FOCUS = "terminal";

export const ALTITUDE_FOCUS_OPTIONS = [
  { value: "all", iconKey: "asterisk", title: "All traffic" },
  { value: "terminal", iconKey: "route", title: "Terminal flow" },
  { value: "low", iconKey: "arrowDownToLine", title: "Low traffic" },
  { value: "high", iconKey: "arrowUpToLine", title: "High traffic" },
  { value: "overflight", iconKey: "plane", title: "Overflight traffic" },
];

const GROUP_ORDER_INDEX = new Map(
  AIRPORT_CONTEXT_GROUP_ORDER.map((group, index) => [group, index]),
);

const PRIMARY_OPACITY = 1;
const SECONDARY_OPACITY = 0.72;
const SUBDUED_OPACITY = 0.42;
const DIMMED_OPACITY = 0.28;
const HARD_DIMMED_OPACITY = 0.18;

export function getAircraftIdentity(aircraft = {}) {
  return aircraft.icao24 || aircraft.callsign || "";
}

export function groupAircraftByAirportContext(aircraft = []) {
  const grouped = new Map(
    AIRPORT_CONTEXT_GROUP_ORDER.map((group) => [group, []]),
  );

  for (const item of aircraft) {
    const group = getAircraftContextGroup(item);
    if (!grouped.has(group)) grouped.set(group, []);
    grouped.get(group).push(item);
  }

  return [...grouped.entries()]
    .map(([group, items]) => ({
      group,
      aircraft: sortAircraftForContext(items),
    }))
    .filter((section) => section.aircraft.length > 0)
    .sort(
      (a, b) =>
        (GROUP_ORDER_INDEX.get(a.group) ?? 99) -
        (GROUP_ORDER_INDEX.get(b.group) ?? 99),
    );
}

export function resolveAircraftContextEmphasis({
  aircraft = {},
  altitudeFocus = "all",
  contextEnabled = true,
  selected = false,
} = {}) {
  if (selected || !contextEnabled) {
    return {
      tone: "primary",
      opacity: PRIMARY_OPACITY,
      showLabel: true,
      showTelemetry: true,
    };
  }

  const visibilityRole = aircraft.airportContext?.visibilityRole || "secondary";
  const focusMatch = getAltitudeFocusMatch(aircraft, altitudeFocus);

  if (altitudeFocus !== "all" && focusMatch === "out") {
    return {
      tone: "subdued",
      opacity:
        getAircraftContextGroup(aircraft) === "High / Passing Over"
          ? HARD_DIMMED_OPACITY
          : SUBDUED_OPACITY,
      showLabel: false,
      showTelemetry: false,
    };
  }

  if (visibilityRole === "dimmed") {
    return {
      tone: "dimmed",
      opacity: altitudeFocus === "all" ? DIMMED_OPACITY : SECONDARY_OPACITY,
      showLabel: altitudeFocus === "overflight",
      showTelemetry: false,
    };
  }

  if (visibilityRole === "secondary") {
    return {
      tone: "secondary",
      opacity: SECONDARY_OPACITY,
      showLabel: true,
      showTelemetry: true,
    };
  }

  return {
    tone: "primary",
    opacity: PRIMARY_OPACITY,
    showLabel: true,
    showTelemetry: true,
  };
}

export function getAltitudeFocusMatch(aircraft = {}, altitudeFocus = "all") {
  if (altitudeFocus === "all") return "in";

  const context = aircraft.airportContext || {};
  const group = context.display?.group || "Unknown";
  const altitudeBand = context.altitudeBand || "unknown";

  if (altitudeFocus === "terminal") {
    return group === "Terminal Flow" ? "in" : "out";
  }

  if (altitudeFocus === "low") {
    return altitudeBand === "surface-tower" || altitudeBand === "terminal-low"
      ? "in"
      : "out";
  }

  if (altitudeFocus === "high") {
    return altitudeBand === "terminal-high" ? "in" : "out";
  }

  if (altitudeFocus === "overflight") {
    return group === "High / Passing Over" ? "in" : "out";
  }

  return "in";
}

export function getAircraftContextGroup(aircraft = {}) {
  const group = aircraft.airportContext?.display?.group;
  return AIRPORT_CONTEXT_GROUP_ORDER.includes(group) ? group : "Unknown";
}

export function getContextTagLabel(aircraft = {}) {
  const context = aircraft.airportContext || {};
  const airspaceLabel = context.airspace?.matched
    ? context.airspace.label
    : "";
  if (airspaceLabel) return airspaceLabel;

  switch (context.altitudeBand) {
    case "surface-tower":
      return "Surface";
    case "terminal-low":
      return "Low";
    case "terminal-high":
      return "High";
    case "enroute":
      return "Enroute";
    case "class-a":
      return "Class A";
    default:
      return context.display?.label || "Context";
  }
}

export function getMovementTagLabel(aircraft = {}) {
  switch (aircraft.airportContext?.movement) {
    case "arrival":
      return "ARR";
    case "departure":
      return "DEP";
    default:
      return getAircraftContextGroup(aircraft) === "High / Passing Over"
        ? "OVER"
        : "";
  }
}

function sortAircraftForContext(aircraft = []) {
  return [...aircraft].sort((a, b) => {
    const roleDelta =
      visibilitySortWeight(a.airportContext?.visibilityRole) -
      visibilitySortWeight(b.airportContext?.visibilityRole);
    if (roleDelta !== 0) return roleDelta;

    const aAlt = Number(a.altitude) || 0;
    const bAlt = Number(b.altitude) || 0;
    return bAlt - aAlt;
  });
}

function visibilitySortWeight(role) {
  if (role === "primary") return 0;
  if (role === "secondary") return 1;
  return 2;
}
