const PRIMARY_OPACITY = 1;
// Lighter dim than the original 0.28 — selecting an aircraft should
// privilege the focal/clicked plane but the rest of the traffic still
// needs to read clearly enough to scan the scene.
const DIMMED_OPACITY = 0.55;

type AirportContextUiRecord = Record<string, any>;

export function getAircraftIdentity(aircraft: AirportContextUiRecord = {}) {
  return aircraft.icao24 || aircraft.callsign || "";
}

export function resolveAircraftContextEmphasis({
  matchesFilters = true,
  selected = false,
}: AirportContextUiRecord = {}) {
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

export function getAircraftContextGroup(aircraft: AirportContextUiRecord = {}) {
  return aircraft.airportContext?.display?.group || "Unknown";
}

export function getContextTagLabel(aircraft: AirportContextUiRecord = {}) {
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
