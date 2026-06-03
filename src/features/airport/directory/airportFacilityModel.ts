import { getDistanceNm } from "../../../utils/aircraftTrafficIntent";
import { toFiniteNumber } from "../../../utils/math";

type FacilityRecord = Record<string, any>;

const NAVAID_DEDUPE_DISTANCE_NM = 0.5;
const NAVAID_DEDUPE_FREQUENCY_KHZ = 2;
const FREQUENCY_DEDUPE_MHZ = 0.005;

const FREQUENCY_TYPE_ALIASES: Record<string, string> = {
  APP: "approach",
  APPROACH: "approach",
  DEP: "departure",
  DEPARTURE: "departure",
  TWR: "tower",
  TOWER: "tower",
  GND: "ground",
  GROUND: "ground",
  CLD: "clearance",
  CLR: "clearance",
  CLEARANCE: "clearance",
  ATIS: "atis",
  GATE: "gate",
  UNICOM: "unicom",
  CTAF: "ctaf",
};

const NAVAID_TYPE_ALIASES: Record<string, string> = {
  VOR: "vor",
  "VOR-DME": "vordme",
  VORDME: "vordme",
  "VOR/DME": "vordme",
  DME: "dme",
  NDB: "ndb",
  TACAN: "tacan",
  VORTAC: "vortac",
};

const NAVAID_NUMERIC_TYPES: Record<string, string> = {
  "0": "dme",
  "1": "ndb",
  "2": "vor",
  "3": "vordme",
  "4": "vordme",
  "5": "tacan",
  "6": "vortac",
};

const SOURCE_ORDER = ["openaip", "ourairports"];
const FREQUENCY_TYPE_ORDER = [
  "tower",
  "ground",
  "approach",
  "departure",
  "clearance",
  "atis",
  "ctaf",
  "unicom",
  "gate",
  "other",
];

const cleanString = (value: unknown) => String(value ?? "").trim();

const upperString = (value: unknown) => cleanString(value).toUpperCase();

const finiteOrNull = (value: unknown) => {
  const numeric = toFiniteNumber(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const sourceRank = (source: unknown) => {
  const index = SOURCE_ORDER.indexOf(String(source || ""));
  return index === -1 ? SOURCE_ORDER.length : index;
};

const frequencyTypeRank = (type: unknown) => {
  const index = FREQUENCY_TYPE_ORDER.indexOf(String(type || ""));
  return index === -1 ? FREQUENCY_TYPE_ORDER.length : index;
};

const uniqueSources = (...records: FacilityRecord[]) =>
  [...new Set(
    records
      .flatMap((record) => record?.sources || record?.source || [])
      .map((source) => String(source || "").trim())
      .filter(Boolean),
  )].sort((left, right) => sourceRank(left) - sourceRank(right));

const normalizeFrequencyType = (value: unknown) => {
  const normalized = upperString(value).replace(/[^A-Z0-9]/g, "");
  return FREQUENCY_TYPE_ALIASES[normalized] || "other";
};

const resolveFrequencyType = (...values: unknown[]) => {
  for (const value of values) {
    const type = normalizeFrequencyType(value);
    if (type !== "other") return type;
    const normalized = upperString(value);
    if (/\bAPP(ROACH)?\b/.test(normalized)) return "approach";
    if (/\bDEP(ARTURE)?\b/.test(normalized)) return "departure";
    if (/\bTWR\b|\bTOWER\b/.test(normalized)) return "tower";
    if (/\bGND\b|\bGROUND\b/.test(normalized)) return "ground";
    if (/\bCLNC\b|\bCLD\b|\bCLR\b|\bCLEARANCE\b/.test(normalized)) {
      return "clearance";
    }
    if (/\bATIS\b/.test(normalized)) return "atis";
    if (/\bUNICOM\b/.test(normalized)) return "unicom";
    if (/\bCTAF\b/.test(normalized)) return "ctaf";
    if (/\bGATE\b/.test(normalized)) return "gate";
  }
  return "other";
};

const normalizeNavaidType = (value: unknown) => {
  const raw = upperString(value);
  if (NAVAID_NUMERIC_TYPES[raw]) return NAVAID_NUMERIC_TYPES[raw];
  const normalized = raw.replace(/[^A-Z0-9]/g, "");
  return NAVAID_TYPE_ALIASES[raw] || NAVAID_TYPE_ALIASES[normalized] || "other";
};

const normalizeAirportIdent = (value: unknown) =>
  upperString(value).replace(/[^A-Z0-9]/g, "");

function normalizeAirportFrequency(record: FacilityRecord | null | undefined) {
  if (!record) return null;
  const airportIdent = normalizeAirportIdent(record.airportIdent ?? record.airport_ident);
  const frequencyMHz = finiteOrNull(
    record.frequencyMHz ?? record.frequencyMhz ?? record.frequency_mhz,
  );
  if (!airportIdent || frequencyMHz == null) return null;

  const source = cleanString(record.source) || "unknown";
  const description = cleanString(record.description ?? record.name);
  const callsign = cleanString(record.callsign) || description;
  return {
    id: cleanString(record.id) || `${source}:${airportIdent}:${frequencyMHz}`,
    airportIdent,
    type: resolveFrequencyType(record.type, callsign, description),
    frequencyMHz: Math.round(frequencyMHz * 1000) / 1000,
    callsign,
    description,
    source,
    sources: [source],
    primary: record.primary === true,
    publicUse: record.publicUse !== false,
  };
}

function frequencyDedupeKey(frequency: FacilityRecord) {
  return `${frequency.airportIdent}:${frequency.type}:${frequency.frequencyMHz.toFixed(3)}`;
}

export function mergeAirportFrequencies({
  openAipFrequencies = [],
  ourAirportsFrequencies = [],
}: FacilityRecord = {}) {
  const merged = new Map<string, FacilityRecord>();

  for (const frequency of [...openAipFrequencies, ...ourAirportsFrequencies]
    .map(normalizeAirportFrequency)
    .filter(Boolean)) {
    const existing = [...merged.values()].find(
      (item) =>
        item.airportIdent === frequency.airportIdent &&
        item.type === frequency.type &&
        Math.abs(item.frequencyMHz - frequency.frequencyMHz) <= FREQUENCY_DEDUPE_MHZ,
    );
    if (existing) {
      const sources = uniqueSources(existing, frequency);
      merged.set(frequencyDedupeKey(existing), {
        ...existing,
        callsign: existing.callsign || frequency.callsign,
        description: existing.description || frequency.description,
        primary: existing.primary || frequency.primary,
        publicUse: existing.publicUse && frequency.publicUse,
        source: sources[0],
        sources,
      });
      continue;
    }

    merged.set(frequencyDedupeKey(frequency), frequency);
  }

  return [...merged.values()].sort((left, right) => {
    const byType = frequencyTypeRank(left.type) - frequencyTypeRank(right.type);
    if (byType !== 0) return byType;
    return left.frequencyMHz - right.frequencyMHz;
  });
}

function normalizeNavaid(record: FacilityRecord | null | undefined) {
  if (!record) return null;
  const lat = finiteOrNull(record.lat ?? record.latitude ?? record.latitude_deg);
  const lon = finiteOrNull(record.lon ?? record.longitude ?? record.longitude_deg);
  const ident = upperString(record.ident ?? record.identifier);
  if (!ident || lat == null || lon == null) return null;

  const source = cleanString(record.source) || "unknown";
  const frequencyKhz = finiteOrNull(
    record.frequencyKhz ?? record.frequencyKHz ?? record.frequency_khz,
  );
  return {
    id: cleanString(record.id) || `${source}:${ident}:${lat}:${lon}`,
    ident,
    name: cleanString(record.name) || ident,
    type: normalizeNavaidType(record.type),
    frequencyKhz: frequencyKhz == null ? null : Math.round(frequencyKhz),
    lat,
    lon,
    elevationFt: finiteOrNull(record.elevationFt ?? record.elevation_ft),
    country: upperString(record.country ?? record.iso_country),
    dme: {
      frequencyKhz: finiteOrNull(
        record.dme?.frequencyKhz ?? record.dme_frequency_khz,
      ),
      channel: cleanString(record.dme?.channel ?? record.dme_channel),
    },
    usageType: cleanString(record.usageType ?? record.usage_type),
    power: cleanString(record.power),
    associatedAirport: normalizeAirportIdent(
      record.associatedAirport ?? record.associated_airport,
    ),
    magneticVariationDeg: finiteOrNull(
      record.magneticVariationDeg ?? record.magnetic_variation_deg,
    ),
    slavedVariationDeg: finiteOrNull(
      record.slavedVariationDeg ?? record.slaved_variation_deg,
    ),
    source,
    sources: [source],
  };
}

const compatibleNavaidTypes = (left: string, right: string) => {
  if (left === right) return true;
  const vorFamily = new Set(["vor", "vordme", "vortac", "tacan", "dme"]);
  return vorFamily.has(left) && vorFamily.has(right);
};

const closeNavaidFrequency = (
  left: number | null | undefined,
  right: number | null | undefined,
) => {
  if (left == null || right == null) return true;
  return Math.abs(left - right) <= NAVAID_DEDUPE_FREQUENCY_KHZ;
};

function isDuplicateNavaid(left: FacilityRecord, right: FacilityRecord) {
  if (left.ident !== right.ident) return false;
  if (!compatibleNavaidTypes(left.type, right.type)) return false;
  if (!closeNavaidFrequency(left.frequencyKhz, right.frequencyKhz)) return false;
  return (
    getDistanceNm(left.lat, left.lon, right.lat, right.lon) <=
    NAVAID_DEDUPE_DISTANCE_NM
  );
}

function mergeNavaidRecords(existing: FacilityRecord, next: FacilityRecord) {
  const sources = uniqueSources(existing, next);
  const preferred = sourceRank(next.source) < sourceRank(existing.source) ? next : existing;
  const secondary = preferred === existing ? next : existing;

  return {
    ...preferred,
    name: preferred.name || secondary.name,
    type:
      preferred.type === "other" && secondary.type !== "other"
        ? secondary.type
        : preferred.type,
    frequencyKhz: preferred.frequencyKhz ?? secondary.frequencyKhz,
    elevationFt: preferred.elevationFt ?? secondary.elevationFt,
    country: preferred.country || secondary.country,
    dme: {
      frequencyKhz:
        preferred.dme?.frequencyKhz ?? secondary.dme?.frequencyKhz ?? null,
      channel: preferred.dme?.channel || secondary.dme?.channel || "",
    },
    associatedAirport:
      preferred.associatedAirport || secondary.associatedAirport || "",
    usageType: preferred.usageType || secondary.usageType || "",
    power: preferred.power || secondary.power || "",
    magneticVariationDeg:
      preferred.magneticVariationDeg ?? secondary.magneticVariationDeg,
    slavedVariationDeg:
      preferred.slavedVariationDeg ?? secondary.slavedVariationDeg,
    source: sources[0],
    sources,
  };
}

export function mergeNearbyNavaids({
  airport = {},
  openAipNavaids = [],
  ourAirportsNavaids = [],
}: FacilityRecord = {}) {
  const originLat = finiteOrNull(airport.lat ?? airport.latitude_deg);
  const originLon = finiteOrNull(airport.lon ?? airport.longitude_deg);
  const merged: FacilityRecord[] = [];

  for (const navaid of [...openAipNavaids, ...ourAirportsNavaids]
    .map(normalizeNavaid)
    .filter(Boolean)) {
    const index = merged.findIndex((item) => isDuplicateNavaid(item, navaid));
    if (index >= 0) {
      merged[index] = mergeNavaidRecords(merged[index], navaid);
      continue;
    }
    merged.push(navaid);
  }

  return merged
    .map((navaid: FacilityRecord) => ({
      ...navaid,
      distanceNm:
        originLat == null || originLon == null
          ? null
          : getDistanceNm(navaid.lat, navaid.lon, originLat, originLon),
    }))
    .sort((left: FacilityRecord, right: FacilityRecord) => {
      const leftDistance = left.distanceNm ?? Number.POSITIVE_INFINITY;
      const rightDistance = right.distanceNm ?? Number.POSITIVE_INFINITY;
      if (leftDistance !== rightDistance) return leftDistance - rightDistance;
      return String(left.ident).localeCompare(String(right.ident));
    });
}
