type AircraftTypeDisplaySource = "desc" | "fallback" | "icao" | "category";

type AircraftTypeDisplayRecord = {
  type?: unknown;
  t?: unknown;
  icaoType?: unknown;
  category?: unknown;
  desc?: unknown;
  description?: unknown;
  [key: string]: unknown;
};

type AircraftTypeFallback = {
  displayName: string;
  shortName: string;
};

const AIRCRAFT_TYPE_FALLBACKS: Record<string, AircraftTypeFallback> = Object.freeze({
  A318: { displayName: "Airbus A318", shortName: "A318" },
  A319: { displayName: "Airbus A319", shortName: "A319" },
  A320: { displayName: "Airbus A320", shortName: "A320" },
  A321: { displayName: "Airbus A321", shortName: "A321" },
  A19N: { displayName: "Airbus A319neo", shortName: "A319neo" },
  A20N: { displayName: "Airbus A320neo", shortName: "A320neo" },
  A21N: { displayName: "Airbus A321neo", shortName: "A321neo" },
  A332: { displayName: "Airbus A330-200", shortName: "A330-200" },
  A333: { displayName: "Airbus A330-300", shortName: "A330-300" },
  A339: { displayName: "Airbus A330-900neo", shortName: "A330-900neo" },
  A359: { displayName: "Airbus A350-900", shortName: "A350-900" },
  A35K: { displayName: "Airbus A350-1000", shortName: "A350-1000" },
  A388: { displayName: "Airbus A380-800", shortName: "A380-800" },
  BCS1: { displayName: "Airbus A220-100", shortName: "A220-100" },
  BCS3: { displayName: "Airbus A220-300", shortName: "A220-300" },
  B737: { displayName: "Boeing 737-700", shortName: "737-700" },
  B738: { displayName: "Boeing 737-800", shortName: "737-800" },
  B739: { displayName: "Boeing 737-900", shortName: "737-900" },
  B37M: { displayName: "Boeing 737 MAX 7", shortName: "737 MAX 7" },
  B38M: { displayName: "Boeing 737 MAX 8", shortName: "737 MAX 8" },
  B39M: { displayName: "Boeing 737 MAX 9", shortName: "737 MAX 9" },
  B3XM: { displayName: "Boeing 737 MAX 10", shortName: "737 MAX 10" },
  B752: { displayName: "Boeing 757-200", shortName: "757-200" },
  B763: { displayName: "Boeing 767-300", shortName: "767-300" },
  B772: { displayName: "Boeing 777-200", shortName: "777-200" },
  B77W: { displayName: "Boeing 777-300ER", shortName: "777-300ER" },
  B788: { displayName: "Boeing 787-8", shortName: "787-8" },
  B789: { displayName: "Boeing 787-9", shortName: "787-9" },
  B78X: { displayName: "Boeing 787-10", shortName: "787-10" },
  B748: { displayName: "Boeing 747-8", shortName: "747-8" },
  BE30: { displayName: "Beechcraft King Air 300", shortName: "King Air 300" },
  C172: { displayName: "Cessna 172 Skyhawk", shortName: "C172" },
  CRJ2: { displayName: "CRJ200", shortName: "CRJ200" },
  CRJ7: { displayName: "CRJ700", shortName: "CRJ700" },
  CRJ9: { displayName: "CRJ900", shortName: "CRJ900" },
  CRJX: { displayName: "CRJ1000", shortName: "CRJ1000" },
  E170: { displayName: "Embraer 170", shortName: "E170" },
  E75L: { displayName: "Embraer 175", shortName: "E175" },
  E75S: { displayName: "Embraer 175", shortName: "E175" },
  E190: { displayName: "Embraer 190", shortName: "E190" },
  E195: { displayName: "Embraer 195", shortName: "E195" },
  E290: { displayName: "Embraer E190-E2", shortName: "E190-E2" },
  E295: { displayName: "Embraer E195-E2", shortName: "E195-E2" },
  PA34: { displayName: "Piper Seneca", shortName: "Seneca" },
  P28A: { displayName: "Piper PA-28", shortName: "PA-28" },
  P46T: { displayName: "Piper Malibu Mirage", shortName: "Malibu Mirage" },
  SR20: { displayName: "Cirrus SR20", shortName: "SR20" },
  SR22: { displayName: "Cirrus SR22", shortName: "SR22" },
});

const UNKNOWN_AIRCRAFT_TYPE: AircraftTypeFallback = Object.freeze({
  displayName: "Unknown",
  shortName: "Unknown",
});

function cleanUpper(value: unknown) {
  return String(value || "").trim().toUpperCase();
}

function cleanDescription(value: unknown) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function titleCaseDescription(value: string) {
  return value
    .toLowerCase()
    .replace(/\b([a-z])/g, (match) => match.toUpperCase())
    .replace(/\bA-(\d)/g, "A$1")
    .replace(/\bCrj-(\d)/g, "CRJ$1")
    .replace(/\bErj-/g, "ERJ-")
    .replace(/\bMax\b/g, "MAX")
    .replace(/\bNeo\b/g, "neo")
    .replace(/\bEr\b/g, "ER")
    .replace(/\bDc\b/g, "DC")
    .replace(/\bMd\b/g, "MD");
}

function compactDisplayName(displayName: string, icaoType: string) {
  if (/^Airbus A\d{3}neo$/i.test(displayName)) {
    return displayName.replace(/^Airbus /i, "");
  }
  if (/^Airbus A\d{3}(?:-\d{3,4})?$/i.test(displayName)) {
    return displayName.replace(/^Airbus /i, "");
  }
  if (/^Boeing \d{3}/i.test(displayName)) {
    return displayName.replace(/^Boeing /i, "");
  }
  if (/^Embraer 1\d{2}$/i.test(displayName)) {
    return `E${displayName.slice(-3)}`;
  }
  return AIRCRAFT_TYPE_FALLBACKS[icaoType]?.shortName || displayName;
}

function normalizeDescription(desc: string, icaoType: string) {
  const fallback = AIRCRAFT_TYPE_FALLBACKS[icaoType];
  if (fallback) return fallback;
  const displayName = titleCaseDescription(desc)
    .replace(/^Bombardier Regional Jet CRJ-?(\d{3,4})$/i, "CRJ$1")
    .replace(/^Canadair Regional Jet CRJ-?(\d{3,4})$/i, "CRJ$1")
    .replace(/^Embraer ERJ-170-200 \(Long Wing\)$/i, "Embraer 175")
    .replace(/^Embraer ERJ 170-200 \(Long Wing\)$/i, "Embraer 175");

  return {
    displayName,
    shortName: compactDisplayName(displayName, icaoType),
  };
}

export function resolveAircraftDisplayModel(aircraft: AircraftTypeDisplayRecord = {}) {
  const icaoType = cleanUpper(aircraft.type || aircraft.icaoType || aircraft.t);
  const category = cleanUpper(aircraft.category);
  const desc = cleanDescription(aircraft.desc || aircraft.description);
  let source: AircraftTypeDisplaySource = "icao";
  let resolved: AircraftTypeFallback | null = null;

  if (desc) {
    resolved = normalizeDescription(desc, icaoType);
    source = "desc";
  } else if (icaoType && AIRCRAFT_TYPE_FALLBACKS[icaoType]) {
    resolved = AIRCRAFT_TYPE_FALLBACKS[icaoType];
    source = "fallback";
  }

  if (!resolved && !icaoType && category) {
    resolved = UNKNOWN_AIRCRAFT_TYPE;
    source = "category";
  }

  const displayName = resolved?.displayName || icaoType || "N/A";
  const shortName = resolved?.shortName || displayName;

  return {
    displayName,
    shortName,
    icaoType,
    category,
    source: resolved || icaoType ? source : "category",
  };
}

export function aircraftTypeSearchText(aircraft: AircraftTypeDisplayRecord = {}) {
  const display = resolveAircraftDisplayModel(aircraft);
  return [
    display.displayName,
    display.shortName,
    display.icaoType,
    display.category,
  ]
    .filter(Boolean)
    .join(" ");
}
