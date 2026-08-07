type JourneyRecord = Record<string, any>;

export type FlightJourneyProgress = {
  phase: "boarding" | "ground" | "airborne" | "arrived";
  progress: number;
  departureTime: number | null;
  arrivalTime: number | null;
};

function asRecord(value: unknown): JourneyRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JourneyRecord)
    : null;
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
  confirmedRoute,
  aircraft,
}: {
  confirmedRoute?: unknown;
  aircraft?: unknown;
} = {}): FlightJourneyProgress | null {
  return routeProgressFromConfirmedRoute({ route: confirmedRoute, aircraft });
}
