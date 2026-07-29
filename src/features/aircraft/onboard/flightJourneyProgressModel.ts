type JourneyRecord = Record<string, any>;

export type FlightJourneyProgress = {
  phase: "boarding" | "ground" | "airborne" | "arrived";
  progress: number;
  departureTime: number | null;
  arrivalTime: number | null;
};

const TERMINAL_STATUS = /\b(arrived|landed|cancelled|canceled|diverted)\b/i;
const AIRBORNE_STATUS = /\b(enroute|airborne|in[-\s]?flight|departed|active)\b/i;
const GROUND_STATUS = /\b(boarding|gate|taxi|pushback|scheduled|delayed)\b/i;

const DEPARTURE_TIME_KEYS = [
  "actualDeparture",
  "actualOut",
  "estimatedDeparture",
  "estimatedOut",
  "scheduledDeparture",
  "scheduledOut",
  "filedDepartureTime",
  "filedDeparture",
  "actual_out",
  "estimated_out",
  "scheduled_out",
  "filed_departure_time",
];

const ARRIVAL_TIME_KEYS = [
  "actualArrival",
  "actualIn",
  "estimatedArrival",
  "estimatedIn",
  "scheduledArrival",
  "scheduledIn",
  "filedArrivalTime",
  "filedArrival",
  "actual_in",
  "estimated_in",
  "scheduled_in",
  "filed_arrival_time",
];

function asRecord(value: unknown): JourneyRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JourneyRecord)
    : null;
}

function readEpoch(record: JourneyRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value == null || value === "") continue;
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric > 10_000_000_000 ? numeric : numeric * 1_000;
    }
    const parsed = Date.parse(String(value));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function readStatus(metadata: JourneyRecord, position: JourneyRecord) {
  return String(
    metadata.status ||
      metadata.phase ||
      position.status ||
      position.phase ||
      position.quality?.status ||
      "",
  ).trim();
}

// This deliberately accepts only FlightAware-derived data. It does not infer a
// progress bar from an ADS-B position: a scheduled journey is a distinct piece
// of private-provider context and must disappear with that grant.
export function resolveFlightJourneyProgress({
  flightAwareFallback,
  now = Date.now(),
}: {
  flightAwareFallback?: unknown;
  now?: number;
} = {}): FlightJourneyProgress | null {
  const fallback = asRecord(flightAwareFallback);
  if (!fallback || fallback.ok !== true) return null;
  const metadata = asRecord(fallback.metadata) || {};
  const position = asRecord(fallback.position) || {};
  const status = readStatus(metadata, position);
  const departureTime = readEpoch(metadata, DEPARTURE_TIME_KEYS);
  const arrivalTime = readEpoch(metadata, ARRIVAL_TIME_KEYS);
  const hasJourneyEvidence = Boolean(status || departureTime || arrivalTime);
  if (!hasJourneyEvidence) return null;

  if (metadata.terminal === true || position.terminal === true || TERMINAL_STATUS.test(status)) {
    return { phase: "arrived", progress: 1, departureTime, arrivalTime };
  }

  if (AIRBORNE_STATUS.test(status) || fallback.hasPosition === true) {
    const elapsedProgress =
      departureTime != null && arrivalTime != null && arrivalTime > departureTime
        ? (now - departureTime) / (arrivalTime - departureTime)
        : 0.55;
    return {
      phase: "airborne",
      progress: Math.min(0.98, Math.max(0.18, elapsedProgress)),
      departureTime,
      arrivalTime,
    };
  }

  if (GROUND_STATUS.test(status)) {
    return { phase: "ground", progress: 0.12, departureTime, arrivalTime };
  }

  return { phase: "boarding", progress: 0.06, departureTime, arrivalTime };
}
