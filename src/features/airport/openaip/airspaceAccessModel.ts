import { toFiniteNumber } from "@/utils/math";

type AirspaceAccessLevel =
  | "blocked"
  | "restricted"
  | "permission-required"
  | "caution"
  | "controlled"
  | "informational"
  | "unknown";

export type AirspaceAccessTag = {
  level: AirspaceAccessLevel;
  label: string;
  shortLabel: string;
  reason: string;
  requiresStatusCheck: boolean;
};

type OpenAipAirspaceRecord = Record<string, any>;

const OPENAIP_AIRSPACE_TYPE = {
  OTHER: 0,
  RESTRICTED: 1,
  DANGER: 2,
  PROHIBITED: 3,
  CTR: 4,
  TMZ: 5,
  RMZ: 6,
  TMA: 7,
  TRA: 8,
  TSA: 9,
  FIR: 10,
  UIR: 11,
  ADIZ: 12,
  ATZ: 13,
  MATZ: 14,
  AIRWAY: 15,
  MTR: 16,
  ALERT: 17,
  WARNING: 18,
  PROTECTED: 19,
  HTZ: 20,
  GLIDING: 21,
  TRP: 22,
  TIZ: 23,
  TIA: 24,
  MTA: 25,
  CTA: 26,
  ACC: 27,
  ASRA: 28,
  OFR: 29,
  MRT: 30,
  TFR: 31,
  VFR_SECTOR: 32,
  FIS_SECTOR: 33,
  LTA: 34,
  UTA: 35,
  MCTR: 36,
} as const;

const OPENAIP_AIRSPACE_TYPE_LABELS: Record<number, string> = {
  0: "Other",
  1: "Restricted Area",
  2: "Danger Area",
  3: "Prohibited Area",
  4: "CTR",
  5: "TMZ",
  6: "RMZ",
  7: "TMA",
  8: "TRA",
  9: "TSA",
  10: "FIR",
  11: "UIR",
  12: "ADIZ",
  13: "ATZ",
  14: "MATZ",
  15: "Airway",
  16: "Military Training Route",
  17: "Alert Area",
  18: "Warning Area",
  19: "Protected Area",
  20: "HTZ",
  21: "Gliding Sector",
  22: "Transponder Setting",
  23: "TIZ",
  24: "TIA",
  25: "Military Training Area",
  26: "CTA",
  27: "ACC Sector",
  28: "Aerial Sporting / Recreational Activity",
  29: "Low Altitude Overflight Restriction",
  30: "Military Route",
  31: "TSA/TRA Feeding Route",
  32: "VFR Sector",
  33: "FIS Sector",
  34: "LTA",
  35: "UTA",
  36: "MCTR",
};

const ICAO_CLASS_LABELS: Record<number, string> = {
  0: "A",
  1: "B",
  2: "C",
  3: "D",
  4: "E",
  5: "F",
  6: "G",
  8: "Unclassified / SUA",
};

const CONTROLLED_TYPES = new Set<number>([
  OPENAIP_AIRSPACE_TYPE.CTR,
  OPENAIP_AIRSPACE_TYPE.TMA,
  OPENAIP_AIRSPACE_TYPE.CTA,
  OPENAIP_AIRSPACE_TYPE.ATZ,
  OPENAIP_AIRSPACE_TYPE.RMZ,
  OPENAIP_AIRSPACE_TYPE.TMZ,
  OPENAIP_AIRSPACE_TYPE.MCTR,
  OPENAIP_AIRSPACE_TYPE.MATZ,
]);

const CONTROLLED_ICAO_CLASSES = new Set<number>([0, 1, 2, 3, 4]);

const DYNAMIC_STATUS_FIELDS = [
  "onDemand",
  "onRequest",
  "byNotam",
  "specialAgreement",
  "requestCompliance",
];

const TAGS: Record<AirspaceAccessLevel, Omit<AirspaceAccessTag, "reason" | "requiresStatusCheck">> = {
  blocked: {
    level: "blocked",
    label: "Blocked",
    shortLabel: "Blocked",
  },
  restricted: {
    level: "restricted",
    label: "Restricted",
    shortLabel: "Restricted",
  },
  "permission-required": {
    level: "permission-required",
    label: "Permission required",
    shortLabel: "Permission",
  },
  caution: {
    level: "caution",
    label: "Caution",
    shortLabel: "Caution",
  },
  controlled: {
    level: "controlled",
    label: "Controlled",
    shortLabel: "Controlled",
  },
  informational: {
    level: "informational",
    label: "Informational",
    shortLabel: "Info",
  },
  unknown: {
    level: "unknown",
    label: "Status unknown",
    shortLabel: "Unknown",
  },
};

const tag = (
  level: AirspaceAccessLevel,
  reason: string,
  requiresStatusCheck = false,
): AirspaceAccessTag => ({
  ...TAGS[level],
  reason,
  requiresStatusCheck,
});

const numericValue = (value: unknown) => {
  const number = toFiniteNumber(value);
  return Number.isFinite(number) ? Number(number) : null;
};

export const openAipAirspaceTypeLabel = (type: unknown) => {
  const numericType = numericValue(type);
  if (numericType == null) return "Airspace";
  return OPENAIP_AIRSPACE_TYPE_LABELS[numericType] || "Airspace";
};

export const openAipIcaoClassLabel = (icaoClass: unknown) => {
  const numericClass = numericValue(icaoClass);
  if (numericClass == null) return "";
  return ICAO_CLASS_LABELS[numericClass] || "";
};

const parseDate = (value: unknown) => {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

const resolveActiveState = (
  airspace: OpenAipAirspaceRecord,
  now: Date,
) => {
  const activeFrom = parseDate(airspace.activeFrom);
  const activeUntil = parseDate(airspace.activeUntil);

  if (activeFrom && now < activeFrom) return "inactive";
  if (activeUntil && now > activeUntil) return "inactive";
  if (activeFrom || activeUntil) return "active";
  return "unknown";
};

const hasDynamicStatus = (airspace: OpenAipAirspaceRecord) =>
  DYNAMIC_STATUS_FIELDS.some((field) => Boolean(airspace[field])) ||
  Boolean(airspace.hoursOfOperation);

const dynamicStatusReason = (airspace: OpenAipAirspaceRecord) => {
  if (airspace.byNotam) return "Status may be activated by NOTAM; confirm current status before entry.";
  if (airspace.onDemand || airspace.onRequest) {
    return "Status can change on demand or request; confirm current status before entry.";
  }
  if (airspace.specialAgreement) return "Entry may depend on a special agreement or authorization.";
  if (airspace.requestCompliance) return "Published as request-compliance airspace; confirm local procedures.";
  if (airspace.hoursOfOperation) return "Hours of operation are published; confirm the current active period.";
  return "Active status is not explicit in OpenAIP; confirm current status before entry.";
};

const activeDependentTag = (
  airspace: OpenAipAirspaceRecord,
  now: Date,
  activeLevel: AirspaceAccessLevel,
  activeReason: string,
) => {
  const activeState = resolveActiveState(airspace, now);
  if (activeState === "inactive") {
    return tag("informational", `${openAipAirspaceTypeLabel(airspace.type)} is not currently active by its published active window.`);
  }
  if (hasDynamicStatus(airspace)) {
    return tag(activeLevel, dynamicStatusReason(airspace), true);
  }
  if (activeState === "active") return tag(activeLevel, activeReason);
  return tag(activeLevel, "Active status is not explicit in OpenAIP; confirm current status before entry.", true);
};

export const classifyOpenAipAirspaceAccess = (
  airspace: OpenAipAirspaceRecord | null | undefined,
  { now = new Date() }: { now?: Date } = {},
): AirspaceAccessTag => {
  if (!airspace) return tag("unknown", "Airspace data is missing.", true);

  const type = numericValue(airspace.type);
  const icaoClass = numericValue(airspace.icaoClass);

  if (type === OPENAIP_AIRSPACE_TYPE.PROHIBITED) {
    return tag("blocked", "Prohibited Area: do not enter unless explicitly authorized.");
  }
  if (type === OPENAIP_AIRSPACE_TYPE.RESTRICTED) {
    return activeDependentTag(
      airspace,
      now,
      "restricted",
      "Restricted Area is active; clearance, controlling authority permission, or inactive confirmation is required.",
    );
  }
  if (type === OPENAIP_AIRSPACE_TYPE.TSA) {
    return activeDependentTag(
      airspace,
      now,
      "restricted",
      "Temporary Segregated Area is active; ordinary civil traffic should avoid entry.",
    );
  }
  if (type === OPENAIP_AIRSPACE_TYPE.TRA) {
    return activeDependentTag(
      airspace,
      now,
      "permission-required",
      "Temporary Reserved Area is active; coordination or authorization may be required.",
    );
  }
  if (type === OPENAIP_AIRSPACE_TYPE.DANGER) {
    return activeDependentTag(
      airspace,
      now,
      "caution",
      "Danger Area is active; avoid unless cleared or confirmed safe.",
    );
  }
  if (type === OPENAIP_AIRSPACE_TYPE.ADIZ) {
    return tag(
      "permission-required",
      "ADIZ: flight plan, identification, communication, or other procedures may be required.",
      hasDynamicStatus(airspace),
    );
  }
  if (type != null && CONTROLLED_TYPES.has(type)) {
    return tag("controlled", `${openAipAirspaceTypeLabel(type)} is controlled or procedure airspace, not blocked by default.`);
  }
  if (icaoClass != null && CONTROLLED_ICAO_CLASSES.has(icaoClass)) {
    return tag("controlled", `Class ${openAipIcaoClassLabel(icaoClass)} controlled airspace is not blocked by default.`);
  }
  if (type === OPENAIP_AIRSPACE_TYPE.FIR || type === OPENAIP_AIRSPACE_TYPE.UIR) {
    return tag("informational", `${openAipAirspaceTypeLabel(type)} is informational flight information airspace.`);
  }

  return tag("unknown", "OpenAIP airspace type is not mapped to a civil access rule; confirm current procedures.", true);
};

export const formatOpenAipAirspaceLimit = (limit: unknown) => {
  if (!limit || typeof limit !== "object") return "";
  const record = limit as Record<string, unknown>;
  const value = numericValue(record.value);
  const unit = numericValue(record.unit);
  const referenceDatum = numericValue(record.referenceDatum);
  if (value == null) return "";

  if (value === 0 && referenceDatum === 0) return "SFC";
  if (unit === 6) return `FL ${value}`;

  const unitLabel = unit === 0 ? "m" : "ft";
  const datumLabel = referenceDatum === 0 ? "AGL" : referenceDatum === 2 ? "STD" : "MSL";
  return `${value} ${unitLabel} ${datumLabel}`;
};
