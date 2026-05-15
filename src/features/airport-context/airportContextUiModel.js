const PRIMARY_OPACITY = 1;
const DIMMED_OPACITY = 0.28;

export function getAircraftIdentity(aircraft = {}) {
  return aircraft.icao24 || aircraft.callsign || "";
}

export function resolveAircraftContextEmphasis({
  matchesFilters = true,
  selected = false,
} = {}) {
  if (selected || matchesFilters) {
    return {
      opacity: PRIMARY_OPACITY,
      showLabel: true,
    };
  }
  return {
    opacity: DIMMED_OPACITY,
    showLabel: false,
  };
}

export function getAircraftContextGroup(aircraft = {}) {
  return aircraft.airportContext?.display?.group || "Unknown";
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
