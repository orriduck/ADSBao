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

function isUserConfirmedRoute(route: unknown) {
  const record = asRecord(route);
  return Boolean(
    record?.temporary === true &&
      String(record?.confidence || "").trim().toLowerCase() === "user-supplied",
  );
}

function coordinate(point: JourneyRecord | null, key: "lat" | "lon") {
  const value = Number(point?.[key]);
  return Number.isFinite(value) ? value : null;
}

function routeProgressFromConfirmedRoute({
  route,
  aircraft,
}: {
  route?: unknown;
  aircraft?: unknown;
} = {}): FlightJourneyProgress | null {
  if (!isUserConfirmedRoute(route)) return null;
  const routeRecord = asRecord(route);
  const aircraftRecord = asRecord(aircraft);
  const origin = asRecord(routeRecord?.origin);
  const destination = asRecord(routeRecord?.destination);
  const originLat = coordinate(origin, "lat");
  const originLon = coordinate(origin, "lon");
  const destinationLat = coordinate(destination, "lat");
  const destinationLon = coordinate(destination, "lon");
  const aircraftLat = coordinate(aircraftRecord, "lat");
  const aircraftLon = coordinate(aircraftRecord, "lon");
  if (
    originLat == null || originLon == null || destinationLat == null ||
    destinationLon == null || aircraftLat == null || aircraftLon == null
  ) {
    return null;
  }
  if (aircraftRecord?.onGround === true) {
    return { phase: "ground", progress: 0.12, departureTime: null, arrivalTime: null };
  }
  const total = greatCircleAngle(originLat, originLon, destinationLat, destinationLon);
  const travelled = greatCircleAngle(originLat, originLon, aircraftLat, aircraftLon);
  if (!(total > 0)) return null;
  const progress = Math.round(
    Math.min(0.98, Math.max(0.08, travelled / total)) * 10_000,
  ) / 10_000;
  return {
    phase: "airborne",
    progress,
    departureTime: null,
    arrivalTime: null,
  };
}

function greatCircleAngle(latA: number, lonA: number, latB: number, lonB: number) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const aLat = toRadians(latA);
  const bLat = toRadians(latB);
  const deltaLat = bLat - aLat;
  const deltaLon = toRadians(lonB - lonA);
  const sinLat = Math.sin(deltaLat / 2);
  const sinLon = Math.sin(deltaLon / 2);
  const haversine = sinLat * sinLat + Math.cos(aLat) * Math.cos(bLat) * sinLon * sinLon;
  return 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

// Progress needs deliberate journey context: private schedule data, or a route
// the user explicitly confirmed. An automatically resolved route by itself is
// never enough to turn an ADS-B position into a passenger journey indicator.
export function resolveFlightJourneyProgress({
  flightAwareFallback,
  confirmedRoute,
  aircraft,
  now = Date.now(),
}: {
  flightAwareFallback?: unknown;
  confirmedRoute?: unknown;
  aircraft?: unknown;
  now?: number;
} = {}): FlightJourneyProgress | null {
  const fallback = asRecord(flightAwareFallback);
  if (!fallback || fallback.ok !== true) {
    return routeProgressFromConfirmedRoute({ route: confirmedRoute, aircraft });
  }
  const metadata = asRecord(fallback.metadata) || {};
  const position = asRecord(fallback.position) || {};
  const status = readStatus(metadata, position);
  const departureTime = readEpoch(metadata, DEPARTURE_TIME_KEYS);
  const arrivalTime = readEpoch(metadata, ARRIVAL_TIME_KEYS);
  const hasJourneyEvidence = Boolean(status || departureTime || arrivalTime);
  if (!hasJourneyEvidence) {
    return routeProgressFromConfirmedRoute({ route: confirmedRoute, aircraft });
  }

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
